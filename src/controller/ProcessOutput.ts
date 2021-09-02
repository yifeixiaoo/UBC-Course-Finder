import InsightFacade from "./InsightFacade";
import {
    ApplyRule,
    Criteria,
    Dataset,
    InsightDataset,
    InsightError,
    NotFoundError, Order,
    Query,
    SingleGroup
} from "./IInsightFacade";
import Decimal from "decimal.js";
import Log from "../Util";

export default class ProcessOutput {
    public dataList: InsightDataset[] = []; // Contains all Datasets added by addDataset (id, kind, numRows)
    public allDataSets: Dataset[] = []; // Contains all Datasets added by addDataset (id , dataset: courses/rooms)
    public currentDataSet: any[]; // Contains all items in the current Dataset to Query (rooms[] or courses[])
    constructor(IF: InsightFacade) {
        this.dataList = IF.dataList;
        this.allDataSets = IF.allDataSets;
        this.currentDataSet = IF.allDataSets;
    }

    public processOutput(queryObject: Query, allSections: any[]): any[] {
        let finalOutput: any[] = [];
        if ("TRANSFORMATIONS" in queryObject) {
            finalOutput = this.createOutputWithTransformations(queryObject, allSections);
        } else {
            finalOutput = this.createOutput(queryObject, allSections);
        }
        let order: any = queryObject.OPTIONS.ORDER;
        if (typeof order === "object") {
            finalOutput = this.sortWithTieBreakers(order, finalOutput);
        } else {
            finalOutput.sort((a, b) => {
                if (a[order] < b[order]) {
                    return -1;
                } else if (a[order] > b[order]) {
                    return 1;
                } else {
                    return 0;
                }
            });
        }
        return finalOutput;
    }

    public createOutputWithTransformations(queryObject: Query, allSections: any[]): any[] {
        let finalOutput: any[] = [];
        let groups: string[] = queryObject.TRANSFORMATIONS.GROUP.KEYS;
        let AllGroups: SingleGroup[] = [];
        for (let g in groups) {
            groups[g] = groups[g].split("_")[1];
        }
        for (let section of allSections) {
            let allCriteria: Criteria[] = [];
            for (let group of groups) {
                allCriteria.push(this.RetrieveCriteria(group, section));
            }
            let checkForRepeats: boolean | number = this.GroupAlreadyExists(allCriteria, AllGroups);
            if (typeof checkForRepeats === "boolean") {
                AllGroups.push(this.createSingleGroup(groups, section));
            } else if (typeof checkForRepeats === "number") {
                AllGroups[checkForRepeats].
                DataFittingCriteria.push(section);
            }
        }
        let processedData: any[] = [];
        for (let group of AllGroups) {
            processedData.push(group.DataFittingCriteria[0]);
        }
        finalOutput = this.createOutput(queryObject, processedData);
        if (queryObject.TRANSFORMATIONS.APPLY.APPLYRULES.length > 0) {
            let position: number = 0;
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

    public fetchApplyValues(queryObject: Query, AllGroups: SingleGroup[], position: number): any[][] {
        let applys: ApplyRule[] = queryObject.TRANSFORMATIONS.APPLY.APPLYRULES;
        let output: any[][] = [];
        for (let apply of applys) {
            output.push([apply.APPLYKEY, this.generateApplyValues(apply, AllGroups, position)]);
        }
        return output;
    }

    public generateApplyValues(CurrApply: ApplyRule, AllGroups: SingleGroup[], position: number): any {
        let AllValues: any[] = [];
        for (let criteria of AllGroups[position].DataFittingCriteria) {
            AllValues.push(criteria[CurrApply.key.split("_")[1]]);
        }
        if (CurrApply.APPLYTOKEN === "COUNT") {
            let prevSeen: any[] = [];
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
                let decimal: Decimal = new Decimal(AllValues[i]);
                AllValues[i] = decimal;
            }
            let total: Decimal = new Decimal(0);
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

    public GroupAlreadyExists(allCriteria: Criteria[], AllGroups: SingleGroup[]): boolean | number {
        for (let i in AllGroups) {
            if (this.sameCriteria(AllGroups[i].MatchingCriteria, allCriteria)) {
                return Number(i);
            }
        }
        return false;
    }

    public sameCriteria (criteria1: Criteria[], criteria2: Criteria[]): boolean {
        let criteriaCounter: number = 0;
        let criteriaLength: number = criteria1.length;
        for (let i in criteria1) {
            let cObject1: Criteria = criteria1[i];
            let cObject2: Criteria = criteria2[i];
            if (cObject1.Criteria_key === cObject2.Criteria_key &&
                cObject1.Criteria_value === cObject2.Criteria_value) {
                criteriaCounter = criteriaCounter + 1;
            }
        }
        if (criteriaCounter === criteriaLength) {
            return true;
        } else {
            return false;
        }
    }

    public RetrieveCriteria(ckey: any, data: any): Criteria {
        let outputCriteria: Criteria = {
            Criteria_key: ckey,
            Criteria_value: data[ckey]
        };
        return outputCriteria;
    }

    public createSingleGroup(groups: any[], section: any): SingleGroup {
        let allCriteria: Criteria[] = [];
        for (let group of groups) {
            allCriteria.push(this.RetrieveCriteria(group, section));
        }
        let outputGroup: SingleGroup = {
            MatchingCriteria: allCriteria,
            DataFittingCriteria: [section]
        };
        return outputGroup;
    }

    public createOutput(queryObject: Query, allSections: any[]): any[] {
        let finalOutput: any[] = [];
        let columns: string[] = queryObject.OPTIONS.COLUMNS;
        for (let section of allSections) {
            let simple = JSON.parse(JSON.stringify(section));
            let cloneObj: any = { };
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

    public sortWithTieBreakers(order: Order, input: any[]): any[] {
        let finalOutput: any[] = input;
        if (order.DIRECTION === "UP") {
            finalOutput.sort((a, b) => {
                return ProcessOutput.sortHelper(order.KEYS, a, b);
            });
        } else if (order.DIRECTION === "DOWN") {
            finalOutput.sort((a, b) => {
                return ProcessOutput.sortHelper(order.KEYS, b, a);
            });
        }
        return finalOutput;
    }

    public static sortHelper(allKeys: any[], a: any, b: any): number {
        for (let i in allKeys) {
            let case1: boolean = a[allKeys[i]] > b[allKeys[i]];
            let case2: boolean = b[allKeys[i]] > a[allKeys[i]];
            if (Number(i) === allKeys.length - 1) {
                if (case1) {
                    return 1;
                } else if (case2) {
                    return -1;
                } else {
                    return 0;
                }
            } else {
                if (b[allKeys[i]] === a[allKeys[i]]) {
                    continue;
                } else {
                    if (case1) {
                        return 1;
                    } else if (case2) {
                        return -1;
                    } else {
                        return 0;
                    }
                }
            }
        }
    }
}
