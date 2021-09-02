"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IInsightFacade_1 = require("./IInsightFacade");
class ProduceOutput {
    constructor(IF) {
        this.dataList = [];
        this.allDataSets = [];
        this.dataList = IF.dataList;
        this.allDataSets = IF.allDataSets;
        this.currentDataSet = IF.allDataSets;
    }
    produceList(queryObject, dataSetList) {
        if (dataSetList.length === 0) {
            throw new IInsightFacade_1.InsightError("no dataset loaded yet");
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
            throw new IInsightFacade_1.NotFoundError("Dataset not yet added");
        }
        return this.traverseQueryObject(queryObject, "QUERY");
    }
    traverseQueryObject(queryObject, level) {
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
    traverseFilter(queryObject) {
        if (queryObject.FILTER_TYPE === "EQ" ||
            queryObject.FILTER_TYPE === "GT" || queryObject.FILTER_TYPE === "LT") {
            return this.retrieveRelevantSections(queryObject, queryObject.mfield, queryObject.FILTER_TYPE);
        }
        if (queryObject.FILTER_TYPE === "IS") {
            return this.retrieveRelevantSections(queryObject, queryObject.sfield, queryObject.FILTER_TYPE);
        }
        if (queryObject.FILTER_TYPE === "NOT") {
            let subQueryResult = this.traverseFilter(queryObject.contents);
            let queryResult = [];
            queryResult = this.currentDataSet.filter((value) => !subQueryResult.includes(value));
            return queryResult;
        }
        if (queryObject.FILTER_TYPE === "AND" || queryObject.FILTER_TYPE === "OR") {
            return this.ApplyLogicToList(queryObject);
        }
    }
    ApplyLogicToList(queryObject) {
        let allSubQueryResults = [];
        for (let filter of queryObject.contents) {
            allSubQueryResults.push(this.traverseFilter(filter));
        }
        if (queryObject.FILTER_TYPE === "AND") {
            let queryResult = allSubQueryResults[0];
            for (let i in allSubQueryResults) {
                if (Number(i) === (allSubQueryResults.length - 1)) {
                    queryResult = queryResult.filter((value) => allSubQueryResults[0].includes(value));
                    break;
                }
                queryResult = queryResult.filter((value) => allSubQueryResults[Number(i) + 1].includes(value));
            }
            return queryResult;
        }
        if (queryObject.FILTER_TYPE === "OR") {
            let queryResult = [];
            for (let i in allSubQueryResults) {
                queryResult = queryResult.concat(allSubQueryResults[i]);
            }
            queryResult = Array.from(new Set(queryResult));
            return queryResult;
        }
    }
    retrieveRelevantSections(queryObject, fieldType, comparison) {
        let currSections = [];
        for (let i in this.currentDataSet) {
            let individualSection = (Object.keys(this.currentDataSet[i]));
            for (let key in individualSection) {
                if (individualSection[key] === fieldType) {
                    if (comparison === "IS") {
                        currSections = currSections.concat(this.processAsterisk(queryObject, this.currentDataSet[i], Object.values(this.currentDataSet[i])[key]));
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
    processAsterisk(queryObject, section, sectionField) {
        let currSections = [];
        if (!queryObject.value.includes("*")) {
            if (sectionField === queryObject.value) {
                currSections.push(section);
            }
        }
        else if (queryObject.value.endsWith("*") && queryObject.value.startsWith("*")) {
            if (queryObject.value.length === 1 || queryObject.value.length === 2) {
                currSections.push(section);
            }
            else if (sectionField.includes(queryObject.value.substring(1, queryObject.value.length - 1))) {
                currSections.push(section);
            }
        }
        else if (queryObject.value.endsWith("*")) {
            if (sectionField.startsWith(queryObject.value.substring(0, queryObject.value.length - 1))) {
                currSections.push(section);
            }
        }
        else if (queryObject.value.startsWith("*")) {
            if (sectionField.endsWith(queryObject.value.substring(1, queryObject.value.length))) {
                currSections.push(section);
            }
        }
        return currSections;
    }
}
exports.default = ProduceOutput;
//# sourceMappingURL=ProduceOutput.js.map