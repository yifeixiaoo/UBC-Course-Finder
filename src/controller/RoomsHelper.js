"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IInsightFacade_1 = require("./IInsightFacade");
const fs = require("fs-extra");
const JSZip = require("jszip");
const parse5 = require("parse5");
const http = require("http");
const ParseIndividualBuildings_1 = require("./ParseIndividualBuildings");
class RoomsHelper {
    static UnZipRooms(id, content) {
        return new Promise((resolve, reject) => {
            try {
                let zip = new JSZip();
                return zip.loadAsync(content, { base64: true })
                    .then((result) => {
                    let ZipCollection = [];
                    result.folder("rooms").forEach((relativePath, file) => {
                        let curr = {
                            path: relativePath
                        };
                        this.allFilePathPairs.push(curr);
                        ZipCollection.push(file.async("string"));
                    });
                    return Promise.all(ZipCollection).then((fileContent) => {
                        for (let i in fileContent) {
                            this.allFilePathPairs[i].file = fileContent[i];
                        }
                        resolve(this.parseHTML(fileContent[fileContent.length - 1], id, content));
                    }).catch((error) => {
                        reject(new IInsightFacade_1.InsightError(error.message));
                    });
                }).catch((error) => {
                    reject(new IInsightFacade_1.InsightError("error while using jszip"));
                });
            }
            catch (error) {
                reject(new IInsightFacade_1.InsightError("error while using jszip"));
            }
        });
    }
    static parseHTML(file, id, content) {
        if (this.isHTML(file)) {
            let parent = parse5.parse(file);
            let allTables = [];
            this.traverse(parent, "table", allTables);
            for (let table of allTables) {
                this.retrieveIndividualBuilding(table, ["even", "odd"]);
            }
            for (let buildingObject of this.allBuildingObjects) {
                let placeholderRoom = {
                    dataset_id: id,
                    fullname: "hehe",
                    shortname: "hehe",
                    number: "hehe",
                    name: "hehe",
                    address: "hehe",
                    type: "hehe",
                    furniture: "hehe",
                    href: "hehe",
                    lat: 420,
                    lon: 420,
                    seats: 420,
                };
                this.allIndexRooms.push(this.traverseTableChild(buildingObject, placeholderRoom));
            }
            return this.retrieveLonLat(this.allIndexRooms).then((allRooms) => {
                let finishedRooms = ParseIndividualBuildings_1.default.traverseAllBuildingHTMLS(allRooms);
                finishedRooms = this.computeName(finishedRooms);
                fs.writeFileSync("./data/" + id + ".json", JSON.stringify(finishedRooms, null, 4));
                this.allBuildingObjects = [];
                this.allIndexRooms = [];
                this.allFilePathPairs = [];
                return Promise.resolve(finishedRooms);
            }).catch((error) => {
                return Promise.reject(new IInsightFacade_1.InsightError(error.message));
            });
        }
    }
    static retrieveLonLat(roomsList) {
        return new Promise((resolve, reject) => {
            try {
                let AllRequests = [];
                for (let room of roomsList) {
                    let address = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team023/" +
                        room.address.toString().split(" ").join("%20");
                    AllRequests.push(this.retrieveIndividualLonLat(room, address));
                }
                return Promise.all(AllRequests).then((result) => {
                    for (let i in result) {
                        roomsList[i].lat = result[i].lat;
                        roomsList[i].lon = result[i].lon;
                    }
                    resolve(roomsList);
                }).catch((error) => {
                    reject(new IInsightFacade_1.InsightError(error.message));
                });
            }
            catch (error) {
                reject(new IInsightFacade_1.InsightError(error.message));
            }
        });
    }
    static retrieveIndividualLonLat(room, address) {
        return new Promise((resolve, reject) => {
            http.get(address, (resp) => {
                if (resp.code === 404) {
                    reject(new IInsightFacade_1.InsightError("GeoResponse error"));
                }
                resp.on("data", (data) => {
                    let gr = JSON.parse(data);
                    resolve(gr);
                });
            });
        }).catch((error) => {
            return Promise.reject(new IInsightFacade_1.InsightError(error.message));
        });
    }
    static traverseTableChild(node, inputRoom) {
        let outputRoom = inputRoom;
        for (let child of node.childNodes) {
            if (Object.keys(child).includes("attrs")) {
                for (let attr of child.attrs) {
                    if (attr.value === "views-field views-field-field-building-code") {
                        outputRoom.shortname = child.childNodes[0].value.trim();
                    }
                    if (attr.value === "views-field views-field-title") {
                        outputRoom.fullname = child.childNodes[1].childNodes[0].value.trim();
                        outputRoom.href = child.childNodes[1].attrs[0].value.trim();
                    }
                    if (attr.value === "views-field views-field-field-building-address") {
                        outputRoom.address = child.childNodes[0].value.trim();
                    }
                }
            }
        }
        return inputRoom;
    }
    static traverse(node, whatToLookFor, result) {
        if (Object.keys(node).includes("nodeName") && node.nodeName === whatToLookFor) {
            result.push(node);
            if (Object.keys(node).includes("childNodes")) {
                const curr = node.childNodes;
                for (const child of curr) {
                    this.traverse(child, whatToLookFor, result);
                }
            }
        }
        else {
            if (Object.keys(node).includes("childNodes")) {
                const curr = node.childNodes;
                for (const child of curr) {
                    this.traverse(child, whatToLookFor, result);
                }
            }
        }
    }
    static retrieveIndividualBuilding(node, whatToLookFor) {
        if (Object.keys(node).includes("attrs") && (typeof node.attrs === "object")) {
            for (let attr of node.attrs) {
                if (whatToLookFor.includes(attr.value.toString())) {
                    this.allBuildingObjects.push(node);
                }
                else {
                    for (let curr of whatToLookFor) {
                        if ((curr + " views-row-first") === attr.value.toString()) {
                            this.allBuildingObjects.push(node);
                        }
                        else if ((curr + " views-row-last") === attr.value.toString()) {
                            this.allBuildingObjects.push(node);
                        }
                        else if ((curr + " views-row-first views-row-last") === attr.value.toString()) {
                            return [node];
                        }
                    }
                }
            }
            if (Object.keys(node).includes("childNodes")) {
                const curr = node.childNodes;
                for (const child of curr) {
                    this.retrieveIndividualBuilding(child, whatToLookFor);
                }
            }
        }
        else {
            if (Object.keys(node).includes("childNodes")) {
                const curr = node.childNodes;
                for (const child of curr) {
                    this.retrieveIndividualBuilding(child, whatToLookFor);
                }
            }
        }
    }
    static isHTML(html) {
        try {
            parse5.parse(html);
        }
        catch (error) {
            return false;
        }
        return true;
    }
    static computeName(allRooms) {
        let outputRooms = allRooms;
        for (let room of outputRooms) {
            room.name = room.shortname + "_" + room.number;
        }
        return outputRooms;
    }
    static ProcessRoom(roomList) {
        let processedList = [];
        for (let room of roomList) {
            if (room) {
                processedList.push(room);
            }
        }
        return processedList;
    }
}
exports.default = RoomsHelper;
RoomsHelper.allBuildingObjects = [];
RoomsHelper.allIndexRooms = [];
RoomsHelper.allFilePathPairs = [];
RoomsHelper.count = 0;
//# sourceMappingURL=RoomsHelper.js.map