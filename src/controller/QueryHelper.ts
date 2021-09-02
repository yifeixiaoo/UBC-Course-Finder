import {Apply, ApplyRule, Group, InsightError, Transformations} from "./IInsightFacade";
import {Query, Where, Options, Order,
    IInsightFacade, InsightDataset, InsightDatasetKind} from "./IInsightFacade";
import Log from "../Util";
import ValidateBodyHelper from "./ValidateBodyHelper";
import ValidateOptionsHelper from "./ValidateOptionsHelper";
import ValidateTransformationsHelper from "./ValidateTransformationsHelper";
export default class QueryHelper {
    public static dataSetToQuery: string = ""; // The first datasetID in COLUMNS
    public static FirstDataSetFound: boolean = false;
    public static ContainsTransformations: boolean = false;
    public static ColumnKeys: string[] = [];
    public static RoomFields: string[] = ["lat" , "lon" , "seats", "fullname", "shortname", "number",
        "name", "address", "type", "furniture", "href"  ];

    public static RoomMFields: string[] = ["lat" , "lon" , "seats"];

    public static RoomSFields: string[] = ["fullname", "shortname", "number",
        "name", "address", "type", "furniture", "href"  ];

    public static CourseFields: string[] = ["avg" , "pass" , "fail" , "audit" , "year",
        "dept", "id", "instructor", "title", "uuid"];

    public static CourseMFields: string[] = ["avg" , "pass" , "fail" , "audit" , "year"];

    public static CourseSFields: string[] = ["dept", "id", "instructor", "title", "uuid"];

    public static UniversalFields: string[] = [];
    public static UniversalMFields: string[] = [];
    public static UniversalSFields: string[] = [];

    public static readQuery(query: any): any {
        if (this.checkProperties(query, ["WHERE", "OPTIONS", "TRANSFORMATIONS"])) {
            let where = query.WHERE;
            let options = query.OPTIONS;
            try {
                let doneQ: Query;
                if (Object.keys(query).includes("TRANSFORMATIONS")) {
                    this.ContainsTransformations = true;
                    let transformations = query.TRANSFORMATIONS;
                    let q: Query = this.placeholderQueryWithTransformations();
                    doneQ = this.validateAll(where, options, transformations, q);
                } else {
                    let q: Query = this.placeholderQuery();
                    doneQ = this.validateAll(where, options, null, q);
                }
                doneQ.datasetID = this.dataSetToQuery;
                this.resetParameters();
                return doneQ;
            } catch (err) {
                this.resetParameters();
                return new InsightError(err.message);
            }
        } else {
            this.resetParameters();
            return new InsightError();
        }
    }

    public static validateAll (where: any, options: any, transformations: any, q: Query): Query {
        let currQ = q;
        // *******************
        // OPTIONS
        currQ.OPTIONS = ValidateOptionsHelper.validateOptions(options, currQ.OPTIONS);
        // *******************
        // TRANSFORMATIONS
        if (transformations !== null) {
            currQ.TRANSFORMATIONS = ValidateTransformationsHelper.
            validateTransformations(currQ.TRANSFORMATIONS, transformations);
        }
        // *******************
        // BODY
        if (Object.keys(where).length === 0) {
            let emptyWhere: Where = {};
            currQ.BODY = emptyWhere;
        } else {
            let placeHolderBody: Where = {};
            currQ.BODY = ValidateBodyHelper.validateBody(placeHolderBody, where);
        }
        // *******************
        return currQ;
    }

    public static checkProperties(queryObject: any, checkList: string[]): boolean {
        for (let key of Object.keys(queryObject)) {
            if (!checkList.includes(key)) {
                return false;
            }
        }
        return true;
    }

    public static CheckForInvalidKey(comparedTo: string, validKeys: string[]): boolean {
        for (let validKey of validKeys) {
            if (comparedTo === QueryHelper.dataSetToQuery + "_" + validKey) {
                return false;
            }
        }
        return true;
    }

    public static resetParameters() {
        this.dataSetToQuery = "";
        this.FirstDataSetFound = false;
        this.ContainsTransformations = false;
        this.ColumnKeys = [];
        this.UniversalFields = [];
        this.UniversalMFields = [];
        this.UniversalSFields = [];
    }

    public static placeholderQueryWithTransformations(): Query {
        let placeholderWhere: Where = {};
        let placeholderOptions: Options = {
            COLUMNS: []
        };
        let placeholderGroup: Group = {
            KEYS: []
        };
        let placeholderApply: Apply = {
            APPLYRULES: []
        };
        let placeholderTransformations: Transformations = {
            GROUP: placeholderGroup,
            APPLY: placeholderApply
        };
        let q: Query = {
            datasetID: "",
            BODY: placeholderWhere,
            OPTIONS: placeholderOptions,
            TRANSFORMATIONS: placeholderTransformations
        };
        return q;
    }

    public static placeholderQuery(): Query {
        let placeholderWhere: Where = {};
        let placeholderOptions: Options = {
            COLUMNS: []
        };
        let q: Query = {
            datasetID: "",
            BODY: placeholderWhere,
            OPTIONS: placeholderOptions
        };
        return q;
    }
}
