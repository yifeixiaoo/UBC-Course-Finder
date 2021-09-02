/**
 * Builds a query object using the current document object model (DOM).
 * Must use the browser's global document object {@link https://developer.mozilla.org/en-US/docs/Web/API/Document}
 * to read DOM information.
 *
 * @returns query object adhering to the query EBNF
 */
CampusExplorer.buildQuery = () => {
    // console.log("CampusExplorer.buildQuery not implemented yet.");
    let query = {};
    let where;
    let options = {};
    let COLUMNS;
    let ORDER;
    let transformations = {};
    let GROUP;
    let apply;
    let id = "";
    let coursesTabActive = document.getElementById("tab-courses").getAttribute("class");
    let roomsTabActive = document.getElementById("tab-rooms").getAttribute("class");
    if (coursesTabActive === "tab-panel active") {
        id = "courses";
    }
    if (roomsTabActive === "tab-panel active") {
        id = "rooms";
    }
    where = queryWhere(id);
    COLUMNS = queryColumns(id);
    ORDER = queryOrder(id);
    GROUP = queryGroups(id);
    apply = queryApply(id);
    query["WHERE"] = where;
    options["COLUMNS"] = COLUMNS; // "OPTIONS": { "COLUMNS": ["courses_avg"] }}
    if (ORDER !== "no") {
        options["ORDER"] = ORDER;
    }
    query["OPTIONS"] = options;
    if (GROUP.length !== 0) {
        transformations["GROUP"] = GROUP;
        if (apply !== null) {
            transformations["APPLY"] = apply;
        }
        query["TRANSFORMATIONS"] = transformations;
    }
    return query;
};

/****** Where ******/
function queryWhere(id) {
    let conditions = {}; // empty where
    let conditionsGeneral = document.getElementsByClassName("form-group conditions");
    let index = 0;
    if (id === "rooms") {
        index = 1;
    }
    let conditionsActive = conditionsGeneral[index];
    let length = conditionsActive.querySelector("div.conditions-container").children.length;
    let filterType = document.querySelector("div.control-group input[checked]").value;
    if (length === 1){
        let container = conditionsActive.querySelector("div.conditions-container").children[0];
        let notIsChecked = container.querySelector("div.control.not input[type=checkbox]").checked;
        let field = container.querySelector("div.control.fields option[selected=selected]").value;
        let operator = container.querySelector("div.control.operators option[selected=selected]").value;
        let term = container.querySelector("div.control.term input[type=text]").value;
        if (field === "audit" || field === "avg" ||
            field === "fail" || field === "pass" ||
            field === "year" || field === "lat" ||
            field === "lon" || field === "seats") {
            term = Number(term); // mfields, cast the term into number
        }
        let elements = {};
        if (term === 0){
            term = "";
        }
        if (notIsChecked){
            let tempElements = {};
            tempElements[id + "_" + field ] = term;
            let tempOperator = {};
            tempOperator[operator] = tempElements;
            elements["NOT"] = tempOperator;
        } else {
            let tempElements = {};
            tempElements[id + "_" + field ] = term;
            elements[operator] = tempElements;
        }
        if (filterType === "none") {
        conditions["NOT"] = elements; // "NOT": {"EQ": {"courses_audit": 0}}
        } else {
            conditions = elements;
        }
    } else if (length > 1) {
        let insideCondition = []; // none
        let outsideCondition = {}; // none
        for (let i = 0; i < length; i++){
            let container = conditionsActive.querySelector("div.conditions-container").children[i];
            let notIsChecked = container.querySelector("div.control.not input[type=checkbox]").checked;
            let field = container.querySelector("div.control.fields option[selected=selected]").value;
            let operators = container.querySelector("div.control.operators option[selected=selected]").value;
            let term = container.querySelector("div.control.term input[type=text]").value;
            if (field === "audit" || field === "avg" ||
                field === "fail" || field === "pass" ||
                field === "year" || field === "lat" ||
                field === "lon" || field === "seats") {
                term = Number(term); // mfields, cast the term into number
            }
            let elements = {};
            let tempElements = {};
            if (term === 0){
                term = "";
            }
            tempElements[id + "_" + field ] = term;
            if (notIsChecked) {
                let tempOperator = {};
                tempOperator[operators] = tempElements;
                elements["NOT"] = tempOperator;
                insideCondition.push(elements); // [first row]
            } else {
                elements[operators] = tempElements;
                insideCondition.push(elements);
            }
        }
        if (filterType === "none") {
            outsideCondition ["OR"] = insideCondition;
            conditions["NOT"] = outsideCondition;
        }
        if (filterType === "all") {
            conditions["AND"] = insideCondition;
        }
        if (filterType === "any") {
            conditions["OR"] = insideCondition;
        }

    }
    return conditions;
}

/****** Columns ******/
function queryColumns(id) {
    let columns; // "{ "COLUMNS": ["courses_avg"] }}
    let columnArray = [];
    let columnsGeneral = document.getElementsByClassName("form-group columns");
    let index = 0;
    if (id === "rooms") {
        index = 1;
    }
    let colsActive = columnsGeneral[index];
    let rawCols = colsActive.querySelectorAll("div.control.field");
    let transCols = colsActive.querySelectorAll("div.control.transformation");
    for (let eachCol of rawCols) {
        let selected = eachCol.querySelector("input[type=checkbox]").checked;
        let keys = eachCol.querySelector("input[type=checkbox]").value;
        if (selected) {
            let name = id + "_" + keys;
            columnArray.push(name);
        }
    }
    for (let eachCol of transCols) { // when there is transformation column
        let keys = eachCol.querySelector("input[type=checkbox]").value;
        let name = keys;
        columnArray.push(name);
    }
    columns = columnArray;
    return columns;
}

/********** Order **********/
function queryOrder(id) {
    let order = {}; // "ORDER": "courses_audit", can only have 1
    let keys = []; // "ORDER": { "dir": "DOWN", "keys": ["maxSeats","rooms_shortname"]}
    let orderGeneral = document.getElementsByClassName("form-group order");
    let index = 0;
    if (id === "rooms") {
        index = 1;
    }
    let orderActive = orderGeneral[index];
    let orderField = orderActive.getElementsByClassName("control order fields")[0];
    let orders = orderField.querySelectorAll("option[selected]");
    for (let eachOrder of orders) {
        let selected = eachOrder.value;
        let name = id + "_" + selected;
        keys.push(name); //
    }
    let descendingChecked = orderActive.querySelector("input[type=checkbox]").checked;
    if (keys.length !== 0) {
        if (descendingChecked) {
            order["dir"] = "DOWN";
            order["keys"] = keys;

        } else {
            order["dir"] = "UP";
            order["keys"] = keys;
        }
    } else if (descendingChecked) {
        order["dir"] = "DOWN";
    } else {
        let notTrue = "no"
        order = notTrue;
    }
    return order;
}

/******* Groups *******/
function queryGroups(id) {
    let group; // "GROUP": ["courses_title", "courses_audit", "courses_instructor"]
    let groupArray = [];
    let groupsGeneral = document.getElementsByClassName("form-group groups");
    let index = 0;
    if (id === "rooms") {
        index = 1;
    }
    let groupsActive = groupsGeneral[index];
    let groups = groupsActive.querySelectorAll("div.control.field");
    for (let eachKey of groups) {
        let selected = eachKey.querySelector("input[type=checkbox]").checked;
        let keys = eachKey.querySelector("input[type=checkbox]").value;
        if (selected) {
            let name = id + "_" + keys;
            groupArray.push(name);
        }
    }
    group = groupArray;
    return group;
}


/******* Apply *******/
function queryApply(id) {
    let apply = []; // "APPLY": [{"overallAvg": { "AVG": "courses_avg"}}, {"MaximumAVG": {"MAX": "courses_audit"}]
    let applyGeneral = document.getElementsByClassName("form-group transformations");
    let termCheck;
    let index = 0;
    if (id === "rooms") {
        index = 1;
    }
    let applyActive = applyGeneral[index];
    let length = applyActive.querySelector("div.transformations-container").children.length;
    for (let i = 0; i < length; i++) {
        let applyContainer = applyActive.querySelector("div.transformations-container").children[i];
        let term = applyContainer.querySelector("div.control.term input[type=text]").value
        let operator = applyContainer.querySelector("div.control.operators option[selected=selected]").value
        let fields = applyContainer.querySelector("div.control.fields option[selected=selected]").value
        let inside = {};
        termCheck = term;
        let finalField = id + "_" + fields;
        inside[operator] = finalField;
        let outside = {};
        outside[term] = inside;
        apply.push(outside);
    }
    let finalApply;
    if (termCheck !== "") {
        finalApply = apply;
    } else {
        finalApply = [];
    }
    return finalApply;
}
