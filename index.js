"use strict";

const http = require('http');

// From RFC 2616 section 13.5.1
const hopByHopHeaders = [
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailers",
    "transfer-encoding",
    "upgrade"
];

module.exports = opts => {
    const agent = new http.Agent({ keepAlive: opts.keepAlive });

    return (req, res) => {
        const proxyReq = http.request({
            method: req.method,
            path: req.url,
            hostname: opts.upstreamHost,
            port: opts.upstreamPort,
            agent
        }, proxyRes => {
            res.statusCode = proxyRes.statusCode;

            for (let i = 0; i < proxyRes.rawHeaders.length; i += 2) {
                const name = proxyRes.rawHeaders[i];
                if (hopByHopHeaders.indexOf(name.toLowerCase()) >= 0) continue;
                const value = proxyRes.rawHeaders[i + 1];
                res.setHeader(name, value);
            }

            proxyRes.pipe(res);
        });

        for (let i = 0; i < req.rawHeaders.length; i += 2) {
            const name = req.rawHeaders[i];
            if (hopByHopHeaders.indexOf(name.toLowerCase()) >= 0) continue;
            const value = req.rawHeaders[i + 1];
            proxyReq.setHeader(name, value);
        }

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
