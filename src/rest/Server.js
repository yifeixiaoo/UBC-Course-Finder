"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const restify = require("restify");
const Util_1 = require("../Util");
const InsightFacade_1 = require("../controller/InsightFacade");
const IInsightFacade_1 = require("../controller/IInsightFacade");
class Server {
    constructor(port) {
        Util_1.default.info("Server::<init>( " + port + " )");
        this.port = port;
    }
    stop() {
        Util_1.default.info("Server::close()");
        const that = this;
        return new Promise(function (fulfill) {
            that.rest.close(function () {
                fulfill(true);
            });
        });
    }
    start() {
        const that = this;
        return new Promise(function (fulfill, reject) {
            try {
                Util_1.default.info("Server::start() - start");
                that.rest = restify.createServer({
                    name: "insightUBC",
                });
                that.rest.use(restify.bodyParser({ mapFiles: true, mapParams: true }));
                that.rest.use(function crossOrigin(req, res, next) {
                    res.header("Access-Control-Allow-Origin", "*");
                    res.header("Access-Control-Allow-Headers", "X-Requested-With");
                    return next();
                });
                that.rest.get("/echo/:msg", Server.echo);
                that.rest.put("/dataset/:id/:kind", Server.addDataset);
                that.rest.del("/dataset/:id", Server.removeDataset);
                that.rest.post("/query ", Server.performQuery);
                that.rest.get("/datasets", Server.listDatasets);
                that.rest.get("/.*", Server.getStatic);
                that.rest.listen(that.port, function () {
                    Util_1.default.info("Server::start() - restify listening: " + that.rest.url);
                    fulfill(true);
                });
                that.rest.on("error", function (err) {
                    Util_1.default.info("Server::start() - restify ERROR: " + err);
                    reject(err);
                });
            }
            catch (err) {
                Util_1.default.error("Server::start() - ERROR: " + err);
                reject(err);
            }
        });
    }
    static addDataset(req, res, next) {
        try {
            let content = req.body.toString("base64");
            Server.IF.addDataset(req.params.id, content, req.params.kind).then((result) => {
                res.json(200, { result: result });
            }).catch((err) => {
                res.json(400, { error: err.message });
            });
        }
        catch (err) {
            res.json(400, { error: err.message });
        }
        return next();
    }
    static removeDataset(req, res, next) {
        try {
            Server.IF.removeDataset(req.params.id).then((result) => {
                res.json(200, { result: result });
            }).catch((err) => {
                if (err instanceof IInsightFacade_1.NotFoundError) {
                    res.json(404, { error: err.message });
                }
                else if (err instanceof InsightFacade_1.default) {
                    res.json(400, { error: err });
                }
                else {
                    res.json(400, { error: err.message });
                }
            });
        }
        catch (err) {
            if (err instanceof IInsightFacade_1.NotFoundError) {
                res.json(404, { error: err.message });
            }
            else if (err instanceof InsightFacade_1.default) {
                res.json(400, { error: err });
            }
            else {
                res.json(400, { error: err.message });
            }
        }
        return next();
    }
    static performQuery(req, res, next) {
        try {
            Server.IF.performQuery(req.body).then((result) => {
                res.json(200, { result: result });
            }).catch((err) => {
                res.json(400, { error: err.message });
            });
        }
        catch (err) {
            res.json(400, { error: err.message });
        }
        return next();
    }
    static listDatasets(req, res, next) {
        Server.IF.listDatasets().then((result) => {
            res.json(200, { result: result });
        });
        return next();
    }
    static echo(req, res, next) {
        Util_1.default.trace("Server::echo(..) - params: " + JSON.stringify(req.params));
        try {
            const response = Server.performEcho(req.params.msg);
            Util_1.default.info("Server::echo(..) - responding " + 200);
            res.json(200, { result: response });
        }
        catch (err) {
            Util_1.default.error("Server::echo(..) - responding 400");
            res.json(400, { error: err });
        }
        return next();
    }
    static performEcho(msg) {
        if (typeof msg !== "undefined" && msg !== null) {
            return `${msg}...${msg}`;
        }
        else {
            return "Message not provided";
        }
    }
    static getStatic(req, res, next) {
        const publicDir = "frontend/public/";
        Util_1.default.trace("RoutHandler::getStatic::" + req.url);
        let path = publicDir + "index.html";
        if (req.url !== "/") {
            path = publicDir + req.url.split("/").pop();
        }
        fs.readFile(path, function (err, file) {
            if (err) {
                res.send(500);
                Util_1.default.error(JSON.stringify(err));
                return next();
            }
            res.write(file);
            res.end();
            return next();
        });
    }
}
exports.default = Server;
Server.IF = new InsightFacade_1.default();
//# sourceMappingURL=Server.js.map