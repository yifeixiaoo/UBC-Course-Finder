import {
    InsightError, NotFoundError,
    CourseSection, Dataset, MComparison, SComparison, Room, FilePathPair, GeoResponse
} from "./IInsightFacade";
import {Query, Where, Options, Columns, Order,
    IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import * as fs from "fs-extra";
import * as JSZip from "jszip";
import * as parse5 from "parse5";
import * as http from "http";
import * as IF from "./InsightFacade";
import InsightFacade from "./InsightFacade";
import { isArray } from "util";
import Log from "../Util";
import HTML = Mocha.reporters.HTML;
import ParseIndividualBuildings from "./ParseIndividualBuildings";
import {request} from "http";
import {on} from "cluster";

export default class RoomsHelper {
    public static allBuildingObjects: any[] = [];
    public static allIndexRooms: Room[] = [];
    public static allFilePathPairs: FilePathPair[] = [];
    public static count = 0;
    // public static allUnzipped: any

    public static UnZipRooms(id: string, content: string): Promise<any> {
        return new Promise<Room[]>((resolve, reject) => {
            try {
                let zip = new JSZip();
                return zip.loadAsync(content, {base64: true})
                    .then((result) => {
                        let ZipCollection: Array<Promise<any>> = [];
                        result.folder("rooms").forEach((relativePath, file) => {
                            let curr: FilePathPair = {
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
                            reject(new InsightError(error.message));
                        });
                    }).catch((error) => {
                        reject(new InsightError("error while using jszip"));
                    });
            } catch (error) {
                reject(new InsightError("error while using jszip"));
            }
        });
    }

    public static parseHTML(file: any, id: string, content: string): Promise<any> {
        if (this.isHTML(file)) {
            let parent = parse5.parse(file);
            let allTables: any[] = [];
            this.traverse(parent, "table", allTables);
            for (let table of allTables) {
                this.retrieveIndividualBuilding(table, ["even", "odd"]);
            }
            for (let buildingObject of this.allBuildingObjects) {
                let placeholderRoom: Room = {
                    dataset_id: id,
                    fullname: "hehe",
                    shortname: "hehe",
                    number: "hehe",
                    name: "hehe",
                    address: "hehe",
                    type: "hehe",
                    furniture: "hehe",
                    href: "hehe",
                    // mfield
                    lat: 420, // latitude
                    lon: 420, // longitude
                    seats: 420, // seats
                };
                this.allIndexRooms.push(this.traverseTableChild(buildingObject, placeholderRoom));
            }
            return this.retrieveLonLat(this.allIndexRooms).then((allRooms) => {
                let finishedRooms: Room[] = ParseIndividualBuildings.traverseAllBuildingHTMLS(allRooms);
                finishedRooms = this.computeName(finishedRooms);
                // Log.info(JSON.stringify(finishedRooms, null, 4));
                fs.writeFileSync("./data/" + id + ".json", JSON.stringify(finishedRooms, null, 4));
                this.allBuildingObjects = [];
                this.allIndexRooms = [];
                this.allFilePathPairs = [];
                return Promise.resolve(finishedRooms);
            }).catch((error) => {
                return Promise.reject(new InsightError(error.message));
            });
        }
    }

    public static retrieveLonLat(roomsList: Room[]): Promise<Room[]> {
        return new Promise((resolve, reject) => {
            try {
                let AllRequests: Array<Promise<any>> = [];
                for (let room of roomsList) {
                    let address = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team023/" +
                        room.address.toString().split(" ").join("%20");
                    AllRequests.push(this.retrieveIndividualLonLat(room, address));
                }
                // Log.info("outside");
                return Promise.all(AllRequests).then((result) => {
                    // Log.info("inside");
                    for (let i in result) {
                        roomsList[i].lat = result[i].lat;
                        roomsList[i].lon = result[i].lon;
                    }
                    // Log.info(roomsList);
                    resolve(roomsList);
                }).catch((error) => {
                    reject(new InsightError(error.message));
                });
            } catch (error) {
                reject(new InsightError(error.message));
            }
        });
    }

    public static retrieveIndividualLonLat(room: Room, address: string): Promise<GeoResponse> {
        return new Promise((resolve, reject) => {
            http.get(address, (resp: any) => {
                if (resp.code === 404) {
                    reject(new InsightError("GeoResponse error"));
                }
                resp.on("data", (data: any) => {
                    let gr = JSON.parse(data);
                    resolve(gr);
                });
            });
        }).catch((error) => {
            return Promise.reject(new InsightError(error.message));
        });
    }

    public static traverseTableChild(node: any, inputRoom: Room): Room {
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

    public static traverse(node: any, whatToLookFor: any, result: any[]) {
        // 1. stop condition
        if (Object.keys(node).includes("nodeName") && node.nodeName === whatToLookFor) {
            result.push(node);
            if (Object.keys(node).includes("childNodes")) {
                const curr = node.childNodes;
                for (const child of curr) {
                    this.traverse(child, whatToLookFor, result);
                }
            }
        } else {
            // 2. recursion
            if (Object.keys(node).includes("childNodes")) {
                const curr = node.childNodes;
                for (const child of curr) {
                    this.traverse(child, whatToLookFor, result);
                }
            }
        }
    }

    public static retrieveIndividualBuilding(node: any, whatToLookFor: string[]) {
        if (Object.keys(node).includes("attrs") && (typeof node.attrs === "object")) {
            for (let attr of node.attrs) {
                if (whatToLookFor.includes(attr.value.toString())) {
                    this.allBuildingObjects.push(node);
                } else {
                    for (let curr of whatToLookFor) {
                        if ((curr + " views-row-first") === attr.value.toString()) {
                            this.allBuildingObjects.push(node);
                        } else if ((curr + " views-row-last") === attr.value.toString()) {
                            this.allBuildingObjects.push(node);
                        } else if ((curr + " views-row-first views-row-last") === attr.value.toString()) {
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
        } else {
            // 2. recursion
            if (Object.keys(node).includes("childNodes")) {
                const curr = node.childNodes;
                for (const child of curr) {
                    this.retrieveIndividualBuilding(child, whatToLookFor);
                }
            }
        }
    }

    public static isHTML(html: any): any {
        try {
            parse5.parse(html);
        } catch (error) {
            // return Promise.reject(new InsightError("error"));
            return false;
        }
        return true;
    }

    public static computeName(allRooms: Room[]) {
        let outputRooms = allRooms;
        for (let room of outputRooms) {
            room.name = room.shortname + "_" + room.number;
        }
        return outputRooms;
    }

    public static ProcessRoom(roomList: Room[]): Room[] {
        let processedList: Room[] = [];
        for (let room of roomList) {
            if (room) {
                processedList.push(room);
            }
        }
        return processedList;
    }
}
