import {FilePathPair, Room} from "./IInsightFacade";
import * as parse5 from "parse5";
import RoomsHelper from "./RoomsHelper";
import Log from "../Util";

export default class ParseIndividualBuildings {
    public static count = 0;
    public static traverseAllBuildingHTMLS(roomsList: any[]): Room[] {
        for (let indexRoom of RoomsHelper.allIndexRooms) {
            for (let filePathPair of RoomsHelper.allFilePathPairs) {
                if (indexRoom.href === ("./" + filePathPair.path)) {
                    filePathPair.indexRoom = indexRoom;
                }
            }
        }
        let outputRooms: Room[] = [];
        for (let filePathPair of RoomsHelper.allFilePathPairs) {
            if (filePathPair.indexRoom !== undefined) {
                outputRooms = outputRooms.concat(this.traverseSingleBuildingHTML(filePathPair));
            }
        }
        return outputRooms;
    }

    public static traverseSingleBuildingHTML(FPP: FilePathPair): Room[] {
        let parent = parse5.parse(FPP.file);
        let allTables: any[] = [];
        RoomsHelper.traverse(parent, "table", allTables);
        let allTableObjects: any[] = [];
        for (let table of allTables) {
            allTableObjects = this.getBuildingElements(table, ["even", "odd"]);
        }
        return this.returnRooms(FPP, allTableObjects);
    }

    public static returnRooms(FPP: FilePathPair, allTableObjects: any[]): Room[] {
        let allRooms: Room[] = this.retrieveRoomVariables(FPP, allTableObjects);
        return allRooms;
    }

    public static retrieveRoomVariables(FPP: FilePathPair, allTableObjects: any[]): Room[] {
        let allOutputRooms: Room[] = [];
        for (let tableObject of allTableObjects) {
            let outputRoom: Room = {
                dataset_id: FPP.indexRoom.dataset_id,
                fullname: FPP.indexRoom.fullname,
                shortname: FPP.indexRoom.shortname,
                number: "hehe",
                name: "hehe",
                address: FPP.indexRoom.address,
                type: "hehe",
                furniture: "hehe",
                href: "hehe",
                // mfield
                lat: FPP.indexRoom.lat,
                lon: FPP.indexRoom.lon,
                seats: 420, // seats
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
                            // Log.info(child.childNodes[0].value.trim());
                            outputRoom.type = child.childNodes[0].value.trim();
                        }
                    }
                }
            }
            allOutputRooms.push(outputRoom);
        }
        return allOutputRooms;
    }

    public static getBuildingElements(node: any, whatToLookFor: string[]): any[] {
        let outputList: any[] = [];
        if (Object.keys(node).includes("attrs") && (typeof node.attrs === "object")) {
            for (let attr of node.attrs) {
                if (whatToLookFor.includes(attr.value.toString())) {
                    return [node];
                } else {
                    for (let curr of whatToLookFor) {
                        if ((curr + " views-row-first") === attr.value.toString()) {
                            return [node];
                        } else if ((curr + " views-row-last") === attr.value.toString()) {
                            return [node];
                        } else if ((curr + " views-row-first views-row-last") === attr.value.toString()) {
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
        } else {
            // 2. recursion
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
