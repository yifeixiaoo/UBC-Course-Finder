import {Apply, ApplyRule, Group, InsightError, Options, Transformations} from "./IInsightFacade";
import QueryHelper from "./QueryHelper";
import Log from "../Util";

export default class ValidateTransformationsHelper {
    public static validateTransformations( T: Transformations, transformations: any): Transformations {
        let currT = T;
        if (QueryHelper.checkProperties(transformations, ["GROUP", "APPLY"])) {
            currT.GROUP = this.validateGroups(transformations.GROUP);
            currT.APPLY = this.validateApply(transformations.APPLY);
            let allKeys: any[] = this.CollectAllKeys(currT);
            if (!this.allColumnKeysInTransformations(allKeys)) {
                throw new InsightError("All column keys must be in Transformations");
            }
            // Log.info(currT);
            return currT;
        } else {
            throw new InsightError("GROUP/APPLY ERROR");
        }
    }

    public static validateGroups(groups: any): Group {
        let AllGroups: string[] = Object.values(groups);
        if (AllGroups.length === 0) {
            throw new InsightError("Groups must be non empty");
        }
        for (let group of AllGroups) {
            if (group.toString().includes("_") && !QueryHelper.FirstDataSetFound) {
                QueryHelper.dataSetToQuery = group.toString().substr(0, group.toString().indexOf("_"));
                QueryHelper.FirstDataSetFound = true;
                let field = group.toString().split("_")[1];
                if (QueryHelper.RoomFields.includes(field)) {
                    QueryHelper.UniversalFields = QueryHelper.RoomFields;
                    QueryHelper.UniversalMFields = QueryHelper.RoomMFields;
                    QueryHelper.UniversalSFields = QueryHelper.RoomSFields;
                } else if (QueryHelper.CourseFields.includes(field)) {
                    QueryHelper.UniversalFields = QueryHelper.CourseFields;
                    QueryHelper.UniversalMFields = QueryHelper.CourseMFields;
                    QueryHelper.UniversalSFields = QueryHelper.CourseSFields;
                } else {
                    throw new InsightError("invalid rooms or courses key");
                }
            } else if (group.toString().includes("_") && QueryHelper.FirstDataSetFound) {
                if (group.toString().substr(0, group.toString().indexOf("_")) !== QueryHelper.dataSetToQuery) {
                    throw new InsightError("Cannot query more than one dataset (groups)");
                }
            } else if (!group.toString().includes("_")) {
                throw new InsightError("Invalid key in groups");
            }
        }
        if (!QueryHelper.FirstDataSetFound) {
            throw new InsightError("First Dataset Not Found");
        }
        let outputGroup: Group = {
            KEYS: AllGroups
        };
        return outputGroup;
    }

    public static validateApply(apply: any): Apply {
        let AllApply: object[] = Object.values(apply);
        let outputApply: Apply = {
            APPLYRULES: []
        };
        for (let a of AllApply) {
            if (typeof a !== "object") {
                throw new InsightError("Apply must be an object");
            } else {
                if (Object.keys(a).length !== 1) {
                    throw new InsightError("Apply can only have one key");
                } else {
                    let currKey = Object.keys(a)[0];
                    let currValue = Object.values(a)[0];
                    outputApply.APPLYRULES.push(this.validateApplyRule(currKey, currValue));
                }
            }
        }
        let SeenApplyKeys: string[] = [];
        for (let i in outputApply.APPLYRULES) {
            let currApplyKey = outputApply.APPLYRULES[i].APPLYKEY;
            if (SeenApplyKeys.includes(currApplyKey)) {
                throw new InsightError("Apply keys must be unique");
            }
            SeenApplyKeys.push(currApplyKey);
        }
        return outputApply;
    }

    public static validateApplyRule(key: any, value: any): ApplyRule {
        let outputApplyRule: ApplyRule = {
            APPLYKEY: key.toString(),
            APPLYTOKEN: "MAX",
            key: "placeholder"
        };
        if (outputApplyRule.APPLYKEY.includes("_")) {
            throw new InsightError("apply key cannot contain an underscore");
        }
        if (Object.keys(value).length !== 1) {
            throw new InsightError("ApplyRule can only have 1 key");
        } else {
            let ApplyKey: string =  Object.keys(value)[0].toString();
            let ApplyValue: string = Object.values(value)[0].toString();
            if (QueryHelper.checkProperties(value, ["MAX", "MIN", "AVG", "COUNT", "SUM"])) {
                if (ApplyKey === "COUNT") {
                    if (QueryHelper.CheckForInvalidKey(ApplyValue, QueryHelper.UniversalFields)) {
                        throw new InsightError("Invalid COUNT key");
                    }
                } else {
                    if (QueryHelper.CheckForInvalidKey(ApplyValue, QueryHelper.UniversalMFields)) {
                        throw new InsightError("Invalid MAX/MIN/AVG/SUM key");
                    }
                }
                outputApplyRule.APPLYTOKEN = ApplyKey;
                outputApplyRule.key = ApplyValue;
            } else {
                throw new InsightError("APPLYTOKEN must be one of MAX, MIN, AVG, COUNT, SUM");
            }
        }
        return outputApplyRule;
    }

    public static CollectAllKeys(T: Transformations): any[] {
        let AllKeys: any[] = [];
        AllKeys = AllKeys.concat(T.GROUP.KEYS);
        for (let applyRule of T.APPLY.APPLYRULES) {
            AllKeys.push(applyRule.APPLYKEY);
        }
        return AllKeys;
    }

    public static allColumnKeysInTransformations(TKeys: any[]): boolean {
        for (let ColumnKey of QueryHelper.ColumnKeys) {
            if (!TKeys.includes(ColumnKey)) {
                return false;
            }
        }
        return true;
    }
}
