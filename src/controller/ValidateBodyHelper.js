"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const IInsightFacade_1 = require("./IInsightFacade");
const QueryHelper_1 = require("./QueryHelper");
class ValidateBodyHelper {
    static validateBody(W, where) {
        let currW = W;
        let values = Object.values(where);
        let keys = Object.keys(where);
        if (keys.length > 1) {
            throw new IInsightFacade_1.InsightError("where empty");
        }
        switch (keys[0]) {
            case "OR":
            case "AND":
                if (values[0] instanceof Array) {
                    currW.FILTER = this.validateLogicComparison(values[0], keys[0].toString());
                    break;
                }
                else {
                    throw new IInsightFacade_1.InsightError("Logic error");
                }
            case "NOT":
                if (values[0] instanceof Object) {
                    currW.FILTER = this.validateNegation(values[0], keys[0].toString());
                    break;
                }
                else {
                    throw new IInsightFacade_1.InsightError("negation error");
                }
            case "IS":
                if (values[0] instanceof Object) {
                    currW.FILTER = this.validateSComp(values[0], keys[0].toString());
                    break;
                }
                else {
                    throw new IInsightFacade_1.InsightError("SComp error");
                }
            case "GT":
            case "LT":
            case "EQ":
                if (values[0] instanceof Object) {
                    currW.FILTER = this.validateMComp(values[0], keys[0].toString());
                    break;
                }
                else {
                    throw new IInsightFacade_1.InsightError("MComp error");
                }
            default:
                throw new IInsightFacade_1.InsightError("Invalid Filter");
        }
        return currW;
    }
    static validateLogicComparison(LComp, LOGIC) {
        let keys = Object.keys(LComp);
        let values = Object.values(LComp);
        if (keys.length === 0 && values.length === 0) {
            throw new IInsightFacade_1.InsightError(LOGIC + " must be a non-empty array");
        }
        if (keys.length === values.length) {
            let mcomp = {
                FILTER_TYPE: "HEHE",
                datasetID: "HEHE",
                mfield: "HEHE",
                value: 69
            };
            let currNot = {
                FILTER_TYPE: "NOT",
                contents: mcomp
            };
            let currLogic = {
                FILTER_TYPE: LOGIC,
                contents: [currNot],
            };
            for (let i in keys) {
                if (Object.values(LComp[i]).length !== 1 && Object.keys(LComp[i]).length !== 1) {
                    throw new IInsightFacade_1.InsightError("number of keys/values must be 1");
                }
                let keyName = Object.keys(LComp[i])[0];
                let valueName = Object.values(LComp[i])[0];
                if ((keyName === "LT") || (keyName === "GT") || (keyName === "EQ")) {
                    currLogic.contents[i] = this.validateMComp(valueName, keyName);
                }
                else if ((keyName === "IS")) {
                    currLogic.contents[i] = this.validateSComp(valueName, keyName);
                }
                else if ((keyName === "NOT")) {
                    currLogic.contents[i] = this.validateNegation(valueName, keyName);
                }
                else if ((keyName === "AND") || (keyName === "OR")) {
                    currLogic.contents[i] = this.validateLogicComparison(valueName, keyName);
                }
                else {
                    throw new IInsightFacade_1.InsightError("Invalid filter key in Logic");
                }
            }
            return currLogic;
        }
        else {
            throw new IInsightFacade_1.InsightError("Number of keys and values dont match");
        }
    }
    static validateNegation(not, NEGATION) {
        let key = Object.keys(not);
        let value = Object.values(not);
        let mcomp = {
            FILTER_TYPE: "HEHE",
            datasetID: "HEHE",
            mfield: "HEHE",
            value: 69
        };
        let currNot = {
            FILTER_TYPE: NEGATION,
            contents: mcomp
        };
        if (key.length === 1 && value.length === 1) {
            if ((key[0] === "LT") || (key[0] === "GT") || (key[0] === "EQ")) {
                currNot.contents = this.validateMComp(value[0], key[0].toString());
            }
            else if ((key[0] === "IS")) {
                currNot.contents = this.validateSComp(value[0], key[0].toString());
            }
            else if ((key[0] === "NOT")) {
                currNot.contents = this.validateNegation(value[0], key[0].toString());
            }
            else if ((key[0] === "AND") || (key[0] === "OR")) {
                currNot.contents = this.validateLogicComparison(value[0], key[0].toString());
            }
            else {
                throw new IInsightFacade_1.InsightError("Invalid filter key in Not");
            }
            return currNot;
        }
        else {
            throw new IInsightFacade_1.InsightError("Error while validating negation");
        }
    }
    static invalidAsterisk(aString) {
        if (!aString.includes("*")) {
            return false;
        }
        else if (aString.length > 2) {
            let middle = aString.substring(1, aString.length - 1);
            for (let i of middle) {
                if (i === "*") {
                    return true;
                }
            }
            return false;
        }
        else {
            return false;
        }
    }
    static validateSComp(sComp, SCOMPARATOR) {
        let key = Object.keys(sComp);
        let value = Object.values(sComp);
        if ((key.length !== 1) || (value.length < 1) || (typeof value[0] !== "string")) {
            throw new IInsightFacade_1.InsightError("SCOMP error");
        }
        if (this.invalidAsterisk(value[0].toString())) {
            throw new IInsightFacade_1.InsightError("asterisk cannot be in the middle of a string");
        }
        if (QueryHelper_1.default.CheckForInvalidKey(key[0], QueryHelper_1.default.UniversalSFields)) {
            throw new IInsightFacade_1.InsightError("not an sComp key");
        }
        let processedSComp = {
            FILTER_TYPE: SCOMPARATOR,
            datasetID: QueryHelper_1.default.dataSetToQuery,
            sfield: key[0].toString().substr(key[0].toString().indexOf("_"), key[0].toString().length).substr(1),
            value: value.toString()
        };
        return processedSComp;
    }
    static validateMComp(mComp, MCOMPARATOR) {
        let key = Object.keys(mComp);
        let value = Object.values(mComp);
        if ((key.length !== 1) || (value.length < 1) || (typeof value[0] !== "number")) {
            throw new IInsightFacade_1.InsightError("MCOMP error");
        }
        if (QueryHelper_1.default.CheckForInvalidKey(key[0], QueryHelper_1.default.UniversalMFields)) {
            throw new IInsightFacade_1.InsightError("not an mComp key");
        }
        let processedMComp = {
            FILTER_TYPE: MCOMPARATOR,
            datasetID: QueryHelper_1.default.dataSetToQuery,
            mfield: key[0].toString().substr(key[0].toString().indexOf("_"), key[0].toString().length).substr(1),
            value: Number(value)
        };
        return processedMComp;
    }
}
exports.default = ValidateBodyHelper;
//# sourceMappingURL=ValidateBodyHelper.js.map