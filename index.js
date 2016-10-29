"use strict";

const http = require('http');
const keepAliveAgent = new http.Agent({ keepAlive: true });

module.exports = opts => {
    return (req, res) => {
        const proxyReq = http.request({
            method: req.method,
            path: req.url,
            headers: req.headers,
            hostname: opts.upstreamHost,
            port: opts.upstreamPort,
            agent: keepAliveAgent
        }, proxyRes => {
            res.statusCode = proxyRes.statusCode;

            for (let i = 0; i < proxyRes.rawHeaders.length; i += 2) {
                const name = proxyRes.rawHeaders[i];
                const value = proxyRes.rawHeaders[i + 1];

                if (name.toLowerCase() !== "content-length" && name.toLowerCase() !== "connection") {
                    res.setHeader(name, value);
                }
            }

            proxyRes.pipe(res);
        });

        req.pipe(proxyReq);

        proxyReq.on("error", e => {
            res.write(e.message);
            res.end();
        });

        req.on("error", e => {
            proxyReq.abort();
            res.write(e.message);
            res.end();
        });

        req.on('aborted', () => {
            proxyReq.abort();
        });
    };
};