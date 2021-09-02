import Log from "../Util";
import {
    Columns,
    CourseSection,
    Logic,
    Dataset,
    IInsightFacade,
    InsightDataset,
    InsightDatasetKind,
    InsightError,
    MComparison,
    Negation,
    NotFoundError,
    Options,
    Order,
    Query,
    ResultTooLargeError,
    Room,
    SComparison,
    Where,
    SingleGroup, Criteria, ApplyRule
} from "./IInsightFacade";
import CoursesHelper from "./CoursesHelper";
import QueryHelper from "./QueryHelper";
import * as fs from "fs-extra";
import RoomsHelper from "./RoomsHelper";
import Decimal from "decimal.js";
import ProduceOutput from "./ProduceOutput";
import ProcessOutput from "./ProcessOutput";

export default class InsightFacade implements IInsightFacade {
    public dataList: InsightDataset[] = []; // Contains all Datasets added by addDataset (id, kind, numRows)
    public allDataSets: Dataset[] = []; // Contains all Datasets added by addDataset (id , dataset: courses/rooms)
    public currentDataSet: any[]; // Contains all items in the current Dataset to Query (rooms[] or courses[])
    public produceO: ProduceOutput;
    public processO: ProcessOutput;
    constructor() {
        Log.trace("InsightFacadeImpl::init()");
        this.produceO = new ProduceOutput(this);
        this.processO = new ProcessOutput(this);
    }

    public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
        for (let data in this.dataList) {
            if (this.dataList[data].id === id) {
                return Promise.reject(new InsightError("Previously added dataset cannot be added again"));
            }
        }
        if (id == null || content == null || kind == null) {
            return Promise.reject(new InsightError("Cannot input type undefined or null"));
        }
        if (id.includes("_")) {
            return Promise.reject(new InsightError("id cannot contain an underscore"));
        }
        let wscounter: number = 0;
        let i: number = 0;
        while (i < id.length) {
            if (id[i] === " ") {
                wscounter += 1;
            }
            i++;
        }
        if (wscounter === id.length) {
            return Promise.reject(new InsightError("id cannot only contain whitespace"));
        }
        // ***************************************************
        // Using JSZip for retrieving course data
        // zipResult.catch((error: Error) => return Promise.reject());
        if (kind === InsightDatasetKind.Courses) {
            return this.addCourses(id, content, kind);
        } else if (kind === InsightDatasetKind.Rooms) {
            return this.addRooms(id, content, kind);
            }
    }

    public addCourses(id: string, content: string, kind: InsightDatasetKind): Promise <string[]> {
        return CoursesHelper.unZipCourses(id, content)
            .then((courseSections) => {
                let currDataset: InsightDataset = {
                    id: id,
                    kind: InsightDatasetKind.Courses,
                    numRows: courseSections.length,
                };
                this.dataList.push(currDataset);
                let currDatasetToList: Dataset = {
                    dataset_id: id,
                    dataset: courseSections,
                };
                let idList: string[] = [];
                for (let obj of this.allDataSets) {
                    idList.push(obj.dataset_id);
                }
                idList.push(currDataset.id);
                this.allDataSets.push(currDatasetToList);
                return Promise.resolve(idList);
            })
            .catch((error: string) => Promise.reject(new InsightError(error)));
    }

    public addRooms(id: string, content: string, kind: InsightDatasetKind): Promise <string[]> {
        return RoomsHelper.UnZipRooms(id, content)
        .then((roomSections) => {
            // Log.info(roomSections);
            let currDataset: InsightDataset = {
                id: id,
                kind: InsightDatasetKind.Rooms,
                numRows: roomSections.length,
            };
            this.dataList.push(currDataset);
            let currDatasetToList: Dataset = {
                dataset_id: id,
                dataset: roomSections,
            };
            let idList: string[] = [];
            for (let obj of this.allDataSets) {
                idList.push(obj.dataset_id);
            }
            idList.push(currDataset.id);
            this.allDataSets.push(currDatasetToList);
            // Log.info(this.allDataSets);
            // Log.info(this.dataList);
            return Promise.resolve(idList);
        })
        .catch((error) => Promise.reject(new InsightError(error.message)));
    }

    public removeDataset(id: string): Promise<string> {
        if (id == null) {
            return Promise.reject(new InsightError("Cannot input type undefined or null"));
        }
        if (id.includes("_")) {
            return Promise.reject(new InsightError("id cannot contain an underscore"));
        }
        let wscounter: number = 0;
        let i: number = 0;
        while (i < id.length) {
            if (id[i] === " ") {
                wscounter += 1;
            }
            i++;
        }
        if (wscounter === id.length) {
            return Promise.reject(new InsightError("id cannot only contain whitespace"));
        }
        return new Promise<string>((resolve, reject) => {
            for (let data in this.dataList) {
                if (this.dataList[data].id === id) {
                    fs.unlinkSync("./data/" + id + ".json");
                    this.dataList.splice(Number((data)), 1);
                    this.allDataSets.splice(Number((data)), 1);
                    resolve(id);
                }
            }
            reject(new NotFoundError("not found"));
        });
    }

    public performQuery(query: any): Promise<any[]> {
        if (!query) {
            return Promise.reject(new InsightError("not query"));
        }
        return new Promise<any[]>(((resolve, reject) => {
            try {
                let QueryObject = QueryHelper.readQuery(query);
                if (QueryObject && QueryObject.stack && QueryObject.message) {
                    return reject(new InsightError(QueryObject.message));
                } else {
                    try {
                        let returnedList: any[] = this.produceO.produceList(QueryObject, this.allDataSets);
                        if (returnedList.length > 5000 && !("TRANSFORMATIONS" in QueryObject)) {
                            return reject(new ResultTooLargeError("maximum 5000"));
                        }
                        if ("TRANSFORMATIONS" in QueryObject) {
                            if ((returnedList.length / QueryObject.TRANSFORMATIONS.GROUP.KEYS.length) > 5000) {
                                return reject(new ResultTooLargeError("maximum 5000"));
                            }
                        }
                        let finalList = this.processO.processOutput(QueryObject, returnedList);
                        Log.info(finalList.length);
                        return resolve(finalList);
                    } catch (error) {
                        return reject(new InsightError(error.message));
                    }
                }
            } catch (error) {
                return reject(new InsightError("performQuery error"));
            }
        }));
    }

    public listDatasets(): Promise<InsightDataset[]> {
        return Promise.resolve(this.dataList);
    }
}
