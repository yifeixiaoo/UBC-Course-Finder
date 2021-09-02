"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IInsightFacade_1 = require("./IInsightFacade");
const QueryHelper_1 = require("./QueryHelper");
class ValidateTransformationsHelper {
    static validateTransformations(T, transformations) {
        let currT = T;
        if (QueryHelper_1.default.checkProperties(transformations, ["GROUP", "APPLY"])) {
            currT.GROUP = this.validateGroups(transformations.GROUP);
            currT.APPLY = this.validateApply(transformations.APPLY);
            let allKeys = this.CollectAllKeys(currT);
            if (!this.allColumnKeysInTransformations(allKeys)) {
                throw new IInsightFacade_1.InsightError("All column keys must be in Transformations");
            }
            return currT;
        }
        else {
            throw new IInsightFacade_1.InsightError("GROUP/APPLY ERROR");
        }
    }
    static validateGroups(groups) {
        let AllGroups = Object.values(groups);
        if (AllGroups.length === 0) {
            throw new IInsightFacade_1.InsightError("Groups must be non empty");
        }
        for (let group of AllGroups) {
            if (group.toString().includes("_") && !QueryHelper_1.default.FirstDataSetFound) {
                QueryHelper_1.default.dataSetToQuery = group.toString().substr(0, group.toString().indexOf("_"));
                QueryHelper_1.default.FirstDataSetFound = true;
                let field = group.toString().split("_")[1];
                if (QueryHelper_1.default.RoomFields.includes(field)) {
                    QueryHelper_1.default.UniversalFields = QueryHelper_1.default.RoomFields;
                    QueryHelper_1.default.UniversalMFields = QueryHelper_1.default.RoomMFields;
                    QueryHelper_1.default.UniversalSFields = QueryHelper_1.default.RoomSFields;
                }
                else if (QueryHelper_1.default.CourseFields.includes(field)) {
                    QueryHelper_1.default.UniversalFields = QueryHelper_1.default.CourseFields;
                    QueryHelper_1.default.UniversalMFields = QueryHelper_1.default.CourseMFields;
                    QueryHelper_1.default.UniversalSFields = QueryHelper_1.default.CourseSFields;
                }
                else {
                    throw new IInsightFacade_1.InsightError("invalid rooms or courses key");
                }
            }
            else if (group.toString().includes("_") && QueryHelper_1.default.FirstDataSetFound) {
                if (group.toString().substr(0, group.toString().indexOf("_")) !== QueryHelper_1.default.dataSetToQuery) {
                    throw new IInsightFacade_1.InsightError("Cannot query more than one dataset (groups)");
                }
            }
            else if (!group.toString().includes("_")) {
                throw new IInsightFacade_1.InsightError("Invalid key in groups");
            }
        }
        if (!QueryHelper_1.default.FirstDataSetFound) {
            throw new IInsightFacade_1.InsightError("First Dataset Not Found");
        }
        let outputGroup = {
            KEYS: AllGroups
        };
        return outputGroup;
    }
    static validateApply(apply) {
        let AllApply = Object.values(apply);
        let outputApply = {
            APPLYRULES: []
        };
        for (let a of AllApply) {
            if (typeof a !== "object") {
                throw new IInsightFacade_1.InsightError("Apply must be an object");
            }
            else {
                if (Object.keys(a).length !== 1) {
                    throw new IInsightFacade_1.InsightError("Apply can only have one key");
                }
                else {
                    let currKey = Object.keys(a)[0];
                    let currValue = Object.values(a)[0];
                    outputApply.APPLYRULES.push(this.validateApplyRule(currKey, currValue));
                }
            }
        }
        let SeenApplyKeys = [];
        for (let i in outputApply.APPLYRULES) {
            let currApplyKey = outputApply.APPLYRULES[i].APPLYKEY;
            if (SeenApplyKeys.includes(currApplyKey)) {
                throw new IInsightFacade_1.InsightError("Apply keys must be unique");
            }
            SeenApplyKeys.push(currApplyKey);
        }
        return outputApply;
    }
    static validateApplyRule(key, value) {
        let outputApplyRule = {
            APPLYKEY: key.toString(),
            APPLYTOKEN: "MAX",
            key: "placeholder"
        };
        if (outputApplyRule.APPLYKEY.includes("_")) {
            throw new IInsightFacade_1.InsightError("apply key cannot contain an underscore");
        }
        if (Object.keys(value).length !== 1) {
            throw new IInsightFacade_1.InsightError("ApplyRule can only have 1 key");
        }
        else {
            let ApplyKey = Object.keys(value)[0].toString();
            let ApplyValue = Object.values(value)[0].toString();
            if (QueryHelper_1.default.checkProperties(value, ["MAX", "MIN", "AVG", "COUNT", "SUM"])) {
                if (ApplyKey === "COUNT") {
                    if (QueryHelper_1.default.CheckForInvalidKey(ApplyValue, QueryHelper_1.default.UniversalFields)) {
                        throw new IInsightFacade_1.InsightError("Invalid COUNT key");
                    }
                }
                else {
                    if (QueryHelper_1.default.CheckForInvalidKey(ApplyValue, QueryHelper_1.default.UniversalMFields)) {
                        throw new IInsightFacade_1.InsightError("Invalid MAX/MIN/AVG/SUM key");
                    }
                }
                outputApplyRule.APPLYTOKEN = ApplyKey;
                outputApplyRule.key = ApplyValue;
            }
            else {
                throw new IInsightFacade_1.InsightError("APPLYTOKEN must be one of MAX, MIN, AVG, COUNT, SUM");
            }
        }
        return outputApplyRule;
    }
    static CollectAllKeys(T) {
        let AllKeys = [];
        AllKeys = AllKeys.concat(T.GROUP.KEYS);
        for (let applyRule of T.APPLY.APPLYRULES) {
            AllKeys.push(applyRule.APPLYKEY);
        }
        return AllKeys;
    }
    static allColumnKeysInTransformations(TKeys) {
        for (let ColumnKey of QueryHelper_1.default.ColumnKeys) {
            if (!TKeys.includes(ColumnKey)) {
                return false;
            }
        }
        return true;
    }
}
exports.default = ValidateTransformationsHelper;
//# sourceMappingURL=ValidateTransformationsHelper.js.map