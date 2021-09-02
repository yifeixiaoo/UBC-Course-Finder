import {InsightError, Logic, MComparison, Negation, SComparison, Where} from "./IInsightFacade";
import QueryHelper from "./QueryHelper";

export default class ValidateBodyHelper {
    public static validateBody (W: Where, where: any): Where {
        let currW = W;
        let values = Object.values(where); // -> gets the array of values
        let keys = Object.keys(where);
        if (keys.length > 1) {
            throw new InsightError("where empty");
        }
        switch (keys[0]) {
            case "OR":
            case "AND":
                if (values[0] instanceof Array) {
                    currW.FILTER = this.validateLogicComparison(values[0], keys[0].toString());
                    break;
                } else {
                    throw new InsightError("Logic error");
                }
            case "NOT" :
                if (values[0] instanceof Object) {
                    currW.FILTER = this.validateNegation(values[0], keys[0].toString());
                    break;
                } else {
                    throw new InsightError("negation error");
                }
            case "IS" :
                if (values[0] instanceof Object) {
                    currW.FILTER = this.validateSComp(values[0], keys[0].toString());
                    break;
                } else {
                    throw new InsightError("SComp error");
                }
            case "GT" :
            case "LT" :
            case "EQ" :
                if (values[0] instanceof Object) {
                    currW.FILTER = this.validateMComp(values[0], keys[0].toString());
                    break;
                } else {
                    throw new InsightError("MComp error");
                }
            default :
                throw new InsightError("Invalid Filter");
        }
        return currW;
    }

    /************* Validating the Filter ***************/
    public static validateLogicComparison(LComp: any, LOGIC: string): Logic {
        let keys = Object.keys(LComp);
        let values = Object.values(LComp);
        if (keys.length === 0 && values.length === 0) {
            throw new InsightError(LOGIC + " must be a non-empty array");
        }
        if (keys.length === values.length) {
            let mcomp: MComparison = {
                FILTER_TYPE: "HEHE",
                datasetID: "HEHE",
                mfield: "HEHE",
                value: 69
            };
            let currNot: Negation = {
                FILTER_TYPE: "NOT",
                contents: mcomp
            };
            let currLogic: Logic = {
                FILTER_TYPE: LOGIC,
                contents: [currNot],
            };
            for (let i in keys) {
                if (Object.values(LComp[i]).length !== 1 && Object.keys(LComp[i]).length !== 1) {
                    throw new InsightError("number of keys/values must be 1");
                }
                let keyName = Object.keys(LComp[i])[0];
                let valueName = Object.values(LComp[i])[0];
                if ((keyName === "LT") || (keyName === "GT") || (keyName === "EQ")) {
                    currLogic.contents[i] = this.validateMComp(valueName, keyName);
                } else if ((keyName === "IS")) {
                    currLogic.contents[i] = this.validateSComp(valueName, keyName);
                } else if ((keyName === "NOT")) {
                    currLogic.contents[i] = this.validateNegation(valueName, keyName);
                } else if ((keyName === "AND") || (keyName === "OR")) {
                    currLogic.contents[i] = this.validateLogicComparison(valueName, keyName);
                } else {
                    throw new InsightError("Invalid filter key in Logic");
                }
            }
            return currLogic;
        } else {
            throw new InsightError("Number of keys and values dont match");
        }
    }

    public static validateNegation(not: any, NEGATION: string): Negation {
        let key = Object.keys(not);
        let value = Object.values(not);
        let mcomp: MComparison = {
            FILTER_TYPE: "HEHE",
            datasetID: "HEHE",
            mfield: "HEHE",
            value: 69
        };
        let currNot: Negation = {
            FILTER_TYPE: NEGATION,
            contents: mcomp
        };
        if (key.length === 1 && value.length === 1) {
            if ((key[0] === "LT") || (key[0] === "GT") || (key[0] === "EQ")) {
                currNot.contents = this.validateMComp(value[0], key[0].toString());
            } else if ((key[0] === "IS")) {
                currNot.contents = this.validateSComp(value[0], key[0].toString());
            } else if ((key[0] === "NOT")) {
                currNot.contents = this.validateNegation(value[0], key[0].toString());
            } else if ((key[0] === "AND") || (key[0] === "OR")) {
                currNot.contents = this.validateLogicComparison(value[0], key[0].toString());
            } else {
                throw new InsightError("Invalid filter key in Not");
            }
            return currNot;
        } else {
            throw new InsightError("Error while validating negation");
        }
    }

    public static invalidAsterisk(aString: string): boolean {
        if (!aString.includes("*")) {
            return false;
        } else if (aString.length > 2) {
            let middle = aString.substring(1, aString.length - 1);
            for (let i of middle) {
                if (i === "*") {
                    return true;
                }
            }
            return false;
        } else {
            return false;
        }
    }

    public static validateSComp(sComp: any, SCOMPARATOR: string): SComparison {
        let key = Object.keys(sComp);
        let value = Object.values(sComp);
        if ((key.length !== 1) || (value.length < 1) || (typeof value[0] !== "string")) {
            throw new InsightError("SCOMP error");
        }
        if (this.invalidAsterisk(value[0].toString())) {
            throw new InsightError("asterisk cannot be in the middle of a string");
        }
        if (QueryHelper.CheckForInvalidKey(key[0], QueryHelper.UniversalSFields)) {
            throw new InsightError("not an sComp key");
        }
        let processedSComp: SComparison = {
            FILTER_TYPE: SCOMPARATOR,
            datasetID: QueryHelper.dataSetToQuery,
            sfield: key[0].toString().substr(key[0].toString().indexOf("_"), key[0].toString().length).substr(1),
            value: value.toString()
        };
        return processedSComp;
    }

    public static validateMComp(mComp: any, MCOMPARATOR: string): MComparison {
        let key = Object.keys(mComp);
        let value = Object.values(mComp);
        if ((key.length !== 1) || (value.length < 1) || (typeof value[0] !== "number")) {
            throw new InsightError("MCOMP error");
        }
        if (QueryHelper.CheckForInvalidKey(key[0], QueryHelper.UniversalMFields)) {
            throw new InsightError("not an mComp key");
        }
        let processedMComp: MComparison = {
            FILTER_TYPE: MCOMPARATOR,
            datasetID: QueryHelper.dataSetToQuery,
            mfield: key[0].toString().substr(key[0].toString().indexOf("_"), key[0].toString().length).substr(1),
            value: Number(value)
        };
        return processedMComp;
    }
}
