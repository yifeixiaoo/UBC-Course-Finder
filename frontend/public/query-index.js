/**
 * This hooks together all the CampusExplorer methods and binds them to clicks on the submit button in the UI.
 *
 * The sequence is as follows:
 * 1.) Click on submit button in the reference UI
 * 2.) Query object is extracted from UI using global document object (CampusExplorer.buildQuery)
 * 3.) Query object is sent to the POST /query endpoint using global XMLHttpRequest object (CampusExplorer.sendQuery)
 * 4.) Result is rendered in the reference UI by calling CampusExplorer.renderResult with the response from the endpoint as argument
 */

// TODO: implement!
// Click on submit button
const submitButton = document.getElementById("submit-button");
submitButton.addEventListener("click", function() {
    let extractedObject = CampusExplorer.buildQuery();
    console.log(JSON.stringify(extractedObject));
    CampusExplorer.sendQuery(extractedObject).then((result) => {
        CampusExplorer.renderResult(result);
    }).catch((error) => {
        CampusExplorer.renderResult(error);
    });
});

// function clickAction() {
//     let extractedObject = CampusExplorer.buildQuery();
//     CampusExplorer.sendQuery(extractedObject).then((result) => {
//         CampusExplorer.renderResult(result);
//     }).catch((error) => {
//         CampusExplorer.renderResult(error);
//     });
// }

