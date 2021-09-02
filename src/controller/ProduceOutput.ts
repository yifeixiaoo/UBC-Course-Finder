import InsightFacade from "./InsightFacade";
import {Dataset, InsightDataset, InsightError, NotFoundError, Query} from "./IInsightFacade";

export default class ProduceOutput {
    public dataList: InsightDataset[] = []; // Contains all Datasets added by addDataset (id, kind, numRows)
    public allDataSets: Dataset[] = []; // Contains all Datasets added by addDataset (id , dataset: courses/rooms)
    public currentDataSet: any[]; // Contains all items in the current Dataset to Query (rooms[] or courses[])
    constructor(IF: InsightFacade) {
        this.dataList = IF.dataList;
        this.allDataSets = IF.allDataSets;
        this.currentDataSet = IF.allDataSets;
    }

    public produceList(queryObject: Query, dataSetList: Dataset[]): any[] {
        if (dataSetList.length === 0) {
            throw new InsightError("no dataset loaded yet");
        }
        let currDataSetID = queryObject.datasetID;
        let dataSetFound = false;
        for (let dataSet of dataSetList) {
            if (currDataSetID === dataSet.dataset_id) {
                dataSetFound = true;
                this.currentDataSet = dataSet.dataset;
            }
        }
        if (dataSetFound === false) {
            throw new NotFoundError("Dataset not yet added");
        }
        return this.traverseQueryObject(queryObject, "QUERY");
    }

    public traverseQueryObject(queryObject: any, level: string): any[] {
        switch (level) {
            case "QUERY":
                return this.traverseQueryObject(queryObject.BODY, "WHERE");
            case "WHERE":
                if (Object.keys(queryObject).length === 0) {
                    return this.currentDataSet;
                }
                return this.traverseQueryObject(queryObject.FILTER, "FILTER");
            case "FILTER":
                return this.traverseFilter(queryObject);
        }
    }

    public traverseFilter(queryObject: any): any[] {
        if (queryObject.FILTER_TYPE === "EQ" ||
            queryObject.FILTER_TYPE === "GT" || queryObject.FILTER_TYPE === "LT") {
            return this.retrieveRelevantSections(queryObject, queryObject.mfield, queryObject.FILTER_TYPE);
        }
        if (queryObject.FILTER_TYPE === "IS") {
            return this.retrieveRelevantSections(queryObject, queryObject.sfield, queryObject.FILTER_TYPE);
        }
        if (queryObject.FILTER_TYPE === "NOT") {
            let subQueryResult: any[] = this.traverseFilter(queryObject.contents);
            let queryResult: any[] = [];
            queryResult = this.currentDataSet.filter((value) => !subQueryResult.includes(value));
            return queryResult;
        }
        if (queryObject.FILTER_TYPE === "AND" || queryObject.FILTER_TYPE === "OR") {
            return this.ApplyLogicToList(queryObject);
        }
    }

    public ApplyLogicToList(queryObject: any): any[] {
        let allSubQueryResults: any[][] = [];
        for (let filter of queryObject.contents) {
            allSubQueryResults.push(this.traverseFilter(filter));
        }
        if (queryObject.FILTER_TYPE === "AND") {
            let queryResult: any[] = allSubQueryResults[0];
            for (let i in allSubQueryResults) {
                if (Number(i) === (allSubQueryResults.length - 1)) {
                    queryResult = queryResult.filter((value) =>
                        allSubQueryResults[0].includes(value));
                    break;
                }
                queryResult = queryResult.filter((value) =>
                    allSubQueryResults[Number(i) + 1].includes(value));
            }
            return queryResult;
        }
        if (queryObject.FILTER_TYPE === "OR") {
            let queryResult: any[] = [];
            for (let i in allSubQueryResults) {
                queryResult = queryResult.concat(allSubQueryResults[i]);
            }
            queryResult = Array.from(new Set(queryResult));
            return queryResult;
        }
    }

    public retrieveRelevantSections(queryObject: any, fieldType: any, comparison: string): any[] {
        let currSections: any[] = [];
        for (let i in this.currentDataSet) {
            let individualSection = (Object.keys(this.currentDataSet[i]));
            for (let key in individualSection) {
                if (individualSection[key] === fieldType) {
                    if (comparison === "IS") {
                        currSections = currSections.concat(this.processAsterisk(
                            queryObject,
                            this.currentDataSet[i],
                            Object.values(this.currentDataSet[i])[key]));
                    }
                    if (comparison === "EQ") {
                        if (Object.values(this.currentDataSet[i])[key] === queryObject.value) {
                            currSections.push(this.currentDataSet[i]);
                        }
                    }
                    if (comparison === "LT") {
                        if (Object.values(this.currentDataSet[i])[key] < queryObject.value) {
                            currSections.push(this.currentDataSet[i]);
                        }
                    }
                    if (comparison === "GT") {
                        if (Object.values(this.currentDataSet[i])[key] > queryObject.value) {
                            currSections.push(this.currentDataSet[i]);
                        }
                    }
                }
            }
        }
        return currSections;
    }

    public processAsterisk(queryObject: any, section: any, sectionField: any): any[] {
        let currSections: any[] = [];
        if (!queryObject.value.includes("*")) {
            if (sectionField === queryObject.value) {
                currSections.push(section);
            }
        } else if (queryObject.value.endsWith("*") && queryObject.value.startsWith("*")) {
            if (queryObject.value.length === 1 ||  queryObject.value.length === 2) {
                currSections.push(section);
            } else if (sectionField.includes
            (queryObject.value.substring(1, queryObject.value.length - 1))) {
                currSections.push(section);
            }
        } else if (queryObject.value.endsWith("*")) {
            if (sectionField.startsWith
            (queryObject.value.substring(0, queryObject.value.length - 1))) {
                currSections.push(section);
            }
        } else if (queryObject.value.startsWith("*")) {
            if (sectionField.endsWith
            (queryObject.value.substring(1, queryObject.value.length))) {
                currSections.push(section);
            }
        }
        return currSections;
    }
}
