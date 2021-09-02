"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Util_1 = require("../Util");
const IInsightFacade_1 = require("./IInsightFacade");
const CoursesHelper_1 = require("./CoursesHelper");
const QueryHelper_1 = require("./QueryHelper");
const fs = require("fs-extra");
const RoomsHelper_1 = require("./RoomsHelper");
const ProduceOutput_1 = require("./ProduceOutput");
const ProcessOutput_1 = require("./ProcessOutput");
class InsightFacade {
    constructor() {
        this.dataList = [];
        this.allDataSets = [];
        Util_1.default.trace("InsightFacadeImpl::init()");
        this.produceO = new ProduceOutput_1.default(this);
        this.processO = new ProcessOutput_1.default(this);
    }
    addDataset(id, content, kind) {
        for (let data in this.dataList) {
            if (this.dataList[data].id === id) {
                return Promise.reject(new IInsightFacade_1.InsightError("Previously added dataset cannot be added again"));
            }
        }
        if (id == null || content == null || kind == null) {
            return Promise.reject(new IInsightFacade_1.InsightError("Cannot input type undefined or null"));
        }
        if (id.includes("_")) {
            return Promise.reject(new IInsightFacade_1.InsightError("id cannot contain an underscore"));
        }
        let wscounter = 0;
        let i = 0;
        while (i < id.length) {
            if (id[i] === " ") {
                wscounter += 1;
            }
            i++;
        }
        if (wscounter === id.length) {
            return Promise.reject(new IInsightFacade_1.InsightError("id cannot only contain whitespace"));
        }
        if (kind === IInsightFacade_1.InsightDatasetKind.Courses) {
            return this.addCourses(id, content, kind);
        }
        else if (kind === IInsightFacade_1.InsightDatasetKind.Rooms) {
            return this.addRooms(id, content, kind);
        }
    }
    addCourses(id, content, kind) {
        return CoursesHelper_1.default.unZipCourses(id, content)
            .then((courseSections) => {
            let currDataset = {
                id: id,
                kind: IInsightFacade_1.InsightDatasetKind.Courses,
                numRows: courseSections.length,
            };
            this.dataList.push(currDataset);
            let currDatasetToList = {
                dataset_id: id,
                dataset: courseSections,
            };
            let idList = [];
            for (let obj of this.allDataSets) {
                idList.push(obj.dataset_id);
            }
            idList.push(currDataset.id);
            this.allDataSets.push(currDatasetToList);
            return Promise.resolve(idList);
        })
            .catch((error) => Promise.reject(new IInsightFacade_1.InsightError(error)));
    }
    addRooms(id, content, kind) {
        return RoomsHelper_1.default.UnZipRooms(id, content)
            .then((roomSections) => {
            let currDataset = {
                id: id,
                kind: IInsightFacade_1.InsightDatasetKind.Rooms,
                numRows: roomSections.length,
            };
            this.dataList.push(currDataset);
            let currDatasetToList = {
                dataset_id: id,
                dataset: roomSections,
            };
            let idList = [];
            for (let obj of this.allDataSets) {
                idList.push(obj.dataset_id);
            }
            idList.push(currDataset.id);
            this.allDataSets.push(currDatasetToList);
            return Promise.resolve(idList);
        })
            .catch((error) => Promise.reject(new IInsightFacade_1.InsightError(error.message)));
    }
    removeDataset(id) {
        if (id == null) {
            return Promise.reject(new IInsightFacade_1.InsightError("Cannot input type undefined or null"));
        }
        if (id.includes("_")) {
            return Promise.reject(new IInsightFacade_1.InsightError("id cannot contain an underscore"));
        }
        let wscounter = 0;
        let i = 0;
        while (i < id.length) {
            if (id[i] === " ") {
                wscounter += 1;
            }
            i++;
        }
        if (wscounter === id.length) {
            return Promise.reject(new IInsightFacade_1.InsightError("id cannot only contain whitespace"));
        }
        return new Promise((resolve, reject) => {
            for (let data in this.dataList) {
                if (this.dataList[data].id === id) {
                    fs.unlinkSync("./data/" + id + ".json");
                    this.dataList.splice(Number((data)), 1);
                    this.allDataSets.splice(Number((data)), 1);
                    resolve(id);
                }
            }
            reject(new IInsightFacade_1.NotFoundError("not found"));
        });
    }
    performQuery(query) {
        if (!query) {
            return Promise.reject(new IInsightFacade_1.InsightError("not query"));
        }
        return new Promise(((resolve, reject) => {
            try {
                let QueryObject = QueryHelper_1.default.readQuery(query);
                if (QueryObject && QueryObject.stack && QueryObject.message) {
                    return reject(new IInsightFacade_1.InsightError(QueryObject.message));
                }
                else {
                    try {
                        let returnedList = this.produceO.produceList(QueryObject, this.allDataSets);
                        if (returnedList.length > 5000 && !("TRANSFORMATIONS" in QueryObject)) {
                            return reject(new IInsightFacade_1.ResultTooLargeError("maximum 5000"));
                        }
                        if ("TRANSFORMATIONS" in QueryObject) {
                            if ((returnedList.length / QueryObject.TRANSFORMATIONS.GROUP.KEYS.length) > 5000) {
                                return reject(new IInsightFacade_1.ResultTooLargeError("maximum 5000"));
                            }
                        }
                        let finalList = this.processO.processOutput(QueryObject, returnedList);
                        Util_1.default.info(finalList.length);
                        return resolve(finalList);
                    }
                    catch (error) {
                        return reject(new IInsightFacade_1.InsightError(error.message));
                    }
                }
            }
            catch (error) {
                return reject(new IInsightFacade_1.InsightError("performQuery error"));
            }
        }));
    }
    listDatasets() {
        return Promise.resolve(this.dataList);
    }
}
exports.default = InsightFacade;
//# sourceMappingURL=InsightFacade.js.map