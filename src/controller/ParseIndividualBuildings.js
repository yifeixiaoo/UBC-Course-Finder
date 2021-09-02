"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const parse5 = require("parse5");
const RoomsHelper_1 = require("./RoomsHelper");
class ParseIndividualBuildings {
    static traverseAllBuildingHTMLS(roomsList) {
        for (let indexRoom of RoomsHelper_1.default.allIndexRooms) {
            for (let filePathPair of RoomsHelper_1.default.allFilePathPairs) {
                if (indexRoom.href === ("./" + filePathPair.path)) {
                    filePathPair.indexRoom = indexRoom;
                }
            }
        }
        let outputRooms = [];
        for (let filePathPair of RoomsHelper_1.default.allFilePathPairs) {
            if (filePathPair.indexRoom !== undefined) {
                outputRooms = outputRooms.concat(this.traverseSingleBuildingHTML(filePathPair));
            }
        }
        return outputRooms;
    }
    static traverseSingleBuildingHTML(FPP) {
        let parent = parse5.parse(FPP.file);
        let allTables = [];
        RoomsHelper_1.default.traverse(parent, "table", allTables);
        let allTableObjects = [];
        for (let table of allTables) {
            allTableObjects = this.getBuildingElements(table, ["even", "odd"]);
        }
        return this.returnRooms(FPP, allTableObjects);
    }
    static returnRooms(FPP, allTableObjects) {
        let allRooms = this.retrieveRoomVariables(FPP, allTableObjects);
        return allRooms;
    }
    static retrieveRoomVariables(FPP, allTableObjects) {
        let allOutputRooms = [];
        for (let tableObject of allTableObjects) {
            let outputRoom = {
                dataset_id: FPP.indexRoom.dataset_id,
                fullname: FPP.indexRoom.fullname,
                shortname: FPP.indexRoom.shortname,
                number: "hehe",
                name: "hehe",
                address: FPP.indexRoom.address,
                type: "hehe",
                furniture: "hehe",
                href: "hehe",
                lat: FPP.indexRoom.lat,
                lon: FPP.indexRoom.lon,
                seats: 420,
            };
            for (let child of tableObject.childNodes) {
                if (Object.keys(child).includes("attrs")) {
                    for (let attr of child.attrs) {
                        if (attr.value === "views-field views-field-field-room-number") {
                            outputRoom.number = child.childNodes[1].childNodes[0].value.trim();
                            outputRoom.href = child.childNodes[1].attrs[0].value.trim();
                        }
                        if (attr.value === "views-field views-field-field-room-capacity") {
                            outputRoom.seats = Number(child.childNodes[0].value.trim());
                        }
                        if (attr.value === "views-field views-field-field-room-furniture") {
                            outputRoom.furniture = child.childNodes[0].value.trim().replace("Classroom-", "");
                        }
                        if (attr.value === "views-field views-field-field-room-type") {
                            outputRoom.type = child.childNodes[0].value.trim();
                        }
                    }
                }
            }
            allOutputRooms.push(outputRoom);
        }
        return allOutputRooms;
    }
    static getBuildingElements(node, whatToLookFor) {
        let outputList = [];
        if (Object.keys(node).includes("attrs") && (typeof node.attrs === "object")) {
            for (let attr of node.attrs) {
                if (whatToLookFor.includes(attr.value.toString())) {
                    return [node];
                }
                else {
                    for (let curr of whatToLookFor) {
                        if ((curr + " views-row-first") === attr.value.toString()) {
                            return [node];
                        }
                        else if ((curr + " views-row-last") === attr.value.toString()) {
                            return [node];
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
                    outputList = outputList.concat(this.getBuildingElements(child, whatToLookFor));
                }
            }
        }
        else {
            if (Object.keys(node).includes("childNodes")) {
                const curr = node.childNodes;
                for (const child of curr) {
                    outputList = outputList.concat(this.getBuildingElements(child, whatToLookFor));
                }
            }
        }
        return outputList;
    }
}
exports.default = ParseIndividualBuildings;
ParseIndividualBuildings.count = 0;
//# sourceMappingURL=ParseIndividualBuildings.js.map