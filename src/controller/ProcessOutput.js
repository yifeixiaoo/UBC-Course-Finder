"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const decimal_js_1 = require("decimal.js");
class ProcessOutput {
    constructor(IF) {
        this.dataList = [];
        this.allDataSets = [];
        this.dataList = IF.dataList;
        this.allDataSets = IF.allDataSets;
        this.currentDataSet = IF.allDataSets;
    }
    processOutput(queryObject, allSections) {
        let finalOutput = [];
        if ("TRANSFORMATIONS" in queryObject) {
            finalOutput = this.createOutputWithTransformations(queryObject, allSections);
        }
        else {
            finalOutput = this.createOutput(queryObject, allSections);
        }
        let order = queryObject.OPTIONS.ORDER;
        if (typeof order === "object") {
            finalOutput = this.sortWithTieBreakers(order, finalOutput);
        }
        else {
            finalOutput.sort((a, b) => {
                if (a[order] < b[order]) {
                    return -1;
                }
                else if (a[order] > b[order]) {
                    return 1;
                }
                else {
                    return 0;
                }
            });
        }
        return finalOutput;
    }
    createOutputWithTransformations(queryObject, allSections) {
        let finalOutput = [];
        let groups = queryObject.TRANSFORMATIONS.GROUP.KEYS;
        let AllGroups = [];
        for (let g in groups) {
            groups[g] = groups[g].split("_")[1];
        }
        for (let section of allSections) {
            let allCriteria = [];
            for (let group of groups) {
                allCriteria.push(this.RetrieveCriteria(group, section));
            }
            let checkForRepeats = this.GroupAlreadyExists(allCriteria, AllGroups);
            if (typeof checkForRepeats === "boolean") {
                AllGroups.push(this.createSingleGroup(groups, section));
            }
            else if (typeof checkForRepeats === "number") {
                AllGroups[checkForRepeats].
                    DataFittingCriteria.push(section);
            }
        }
        let processedData = [];
        for (let group of AllGroups) {
            processedData.push(group.DataFittingCriteria[0]);
        }
        finalOutput = this.createOutput(queryObject, processedData);
        if (queryObject.TRANSFORMATIONS.APPLY.APPLYRULES.length > 0) {
            let position = 0;
            for (let output of finalOutput) {
                let ApplyList = this.fetchApplyValues(queryObject, AllGroups, position);
                for (let singleApply of ApplyList) {
                    output[singleApply[0]] = singleApply[1];
                }
                position = position + 1;
            }
        }
        return finalOutput;
    }
    fetchApplyValues(queryObject, AllGroups, position) {
        let applys = queryObject.TRANSFORMATIONS.APPLY.APPLYRULES;
        let output = [];
        for (let apply of applys) {
            output.push([apply.APPLYKEY, this.generateApplyValues(apply, AllGroups, position)]);
        }
        return output;
    }
    generateApplyValues(CurrApply, AllGroups, position) {
        let AllValues = [];
        for (let criteria of AllGroups[position].DataFittingCriteria) {
            AllValues.push(criteria[CurrApply.key.split("_")[1]]);
        }
        if (CurrApply.APPLYTOKEN === "COUNT") {
            let prevSeen = [];
            for (let i in AllValues) {
                if (!prevSeen.includes(AllValues[i])) {
                    prevSeen.push(AllValues[i]);
                }
            }
            return prevSeen.length;
        }
        if (CurrApply.APPLYTOKEN === "MAX") {
            return Math.max.apply(null, AllValues);
        }
        if (CurrApply.APPLYTOKEN === "MIN") {
            return Math.min.apply(null, AllValues);
        }
        if (CurrApply.APPLYTOKEN === "AVG") {
            for (let i in AllValues) {
                let decimal = new decimal_js_1.default(AllValues[i]);
                AllValues[i] = decimal;
            }
            let total = new decimal_js_1.default(0);
            for (let i in AllValues) {
                total = total.add(AllValues[i]);
            }
            let avg = total.toNumber() / Number(AllValues.length);
            return Number(avg.toFixed(2));
        }
        if (CurrApply.APPLYTOKEN === "SUM") {
            let total = 0;
            for (let i in AllValues) {
                total = total + AllValues[i];
            }
            return Number(total.toFixed(2));
        }
    }
    GroupAlreadyExists(allCriteria, AllGroups) {
        for (let i in AllGroups) {
            if (this.sameCriteria(AllGroups[i].MatchingCriteria, allCriteria)) {
                return Number(i);
            }
        }
        return false;
    }
    sameCriteria(criteria1, criteria2) {
        let criteriaCounter = 0;
        let criteriaLength = criteria1.length;
        for (let i in criteria1) {
            let cObject1 = criteria1[i];
            let cObject2 = criteria2[i];
            if (cObject1.Criteria_key === cObject2.Criteria_key &&
                cObject1.Criteria_value === cObject2.Criteria_value) {
                criteriaCounter = criteriaCounter + 1;
            }
        }
        if (criteriaCounter === criteriaLength) {
            return true;
        }
        else {
            return false;
        }
    }
    RetrieveCriteria(ckey, data) {
        let outputCriteria = {
            Criteria_key: ckey,
            Criteria_value: data[ckey]
        };
        return outputCriteria;
    }
    createSingleGroup(groups, section) {
        let allCriteria = [];
        for (let group of groups) {
            allCriteria.push(this.RetrieveCriteria(group, section));
        }
        let outputGroup = {
            MatchingCriteria: allCriteria,
            DataFittingCriteria: [section]
        };
        return outputGroup;
    }
    createOutput(queryObject, allSections) {
        let finalOutput = [];
        let columns = queryObject.OPTIONS.COLUMNS;
        for (let section of allSections) {
            let simple = JSON.parse(JSON.stringify(section));
            let cloneObj = {};
            for (let col of columns) {
                if (col.includes("_")) {
                    let fieldFromSection = col.split("_")[1];
                    cloneObj[col] = simple[fieldFromSection];
                }
            }
            finalOutput.push(cloneObj);
        }
        return finalOutput;
    }
    sortWithTieBreakers(order, input) {
        let finalOutput = input;
        if (order.DIRECTION === "UP") {
            finalOutput.sort((a, b) => {
                return ProcessOutput.sortHelper(order.KEYS, a, b);
            });
        }
        else if (order.DIRECTION === "DOWN") {
            finalOutput.sort((a, b) => {
                return ProcessOutput.sortHelper(order.KEYS, b, a);
            });
        }
        return finalOutput;
    }
    static sortHelper(allKeys, a, b) {
        for (let i in allKeys) {
            let case1 = a[allKeys[i]] > b[allKeys[i]];
            let case2 = b[allKeys[i]] > a[allKeys[i]];
            if (Number(i) === allKeys.length - 1) {
                if (case1) {
                    return 1;
                }
                else if (case2) {
                    return -1;
                }
                else {
                    return 0;
                }
            }
            else {
                if (b[allKeys[i]] === a[allKeys[i]]) {
                    continue;
                }
                else {
                    if (case1) {
                        return 1;
                    }
                    else if (case2) {
                        return -1;
                    }
                    else {
                        return 0;
                    }
                }
            }
        }
    }
}
exports.default = ProcessOutput;
//# sourceMappingURL=ProcessOutput.js.map