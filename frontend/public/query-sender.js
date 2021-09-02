/**
 * Receives a query object as parameter and sends it as Ajax request to the POST /query REST endpoint.
 *
 * @param query The query object
 * @returns {Promise} Promise that must be fulfilled if the Ajax request is successful and be rejected otherwise.
 */
CampusExplorer.sendQuery = (query) => {
    return new Promise((resolve, reject) => {
        try {
            let xmlRequest = new XMLHttpRequest();
            xmlRequest.open("POST", "/query");
            xmlRequest.setRequestHeader("Content-Type", "application/json");
            xmlRequest.send(JSON.stringify(query));
            xmlRequest.onload = () => {
                let processedInput = JSON.parse(xmlRequest.responseText);
                resolve(processedInput);
            };
            xmlRequest.onerror = () => {
                reject("Query Sender Error");
            }
        } catch (error) {
            reject("Query Sender Error: ", error);
        }
    });
};
