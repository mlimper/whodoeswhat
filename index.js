//TODO:
// DELETE TEAM MEMBER BUTTON
// EDIT BUTTON TEAM
// EDIT BUTTON RESP

//TODO: pw protected files
/*
    https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt
    function getMessageEncoding() {
    const messageBox = document.querySelector(".aes-gcm #message");
    const message = messageBox.value;
    const enc = new TextEncoder();
    return enc.encode(message);
  }
  
  function encryptMessage(key) {
    const encoded = getMessageEncoding();
    // iv will be needed for decryption
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    return window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv },
      key,
      encoded,
    );
  }
*/

const gSchemaVersion = "0.1-dev";

//------------------------------------------------------------------------------
// DATA STRUCTURES
//------------------------------------------------------------------------------

class Responsibility
{
    constructor(id, title, description, weeklyHours)
    {
      this.id          = id;
      this.title       = title;
      this.description = description;
      this.weeklyHours = weeklyHours;
      this.teamMemberID  = -1;
    }
}

//------------------------------------------------------------------------------

class TeamMember
{
    constructor(id, name, title, respIDs, weeklyHourBudget,
                focusScore, workloadScore)
    {
        this.id               = id;
        this.name             = name;
        this.title            = title;
        this.respIDs          = respIDs;
        this.weeklyHourBudget = weeklyHourBudget;
        this.focusScore       = focusScore;
        this.workloadScore    = workloadScore;
    }
}

//------------------------------------------------------------------------------

class NumberAnimation
{
    constructor(elem, srcVal, tgtVal)
    {
        this.elem   = elem;
        this.srcVal = srcVal;
        this.tgtVal = tgtVal;
        this.curVal = srcVal;
    }
}

//------------------------------------------------------------------------------
// GLOBAL VARIABLES
//------------------------------------------------------------------------------

let gRespsIDCounter = 0;

//------------------------------------------------------------------------------

let gTeamIDCounter = 0;

//------------------------------------------------------------------------------

let gResps = [];

//------------------------------------------------------------------------------

let gTeam = [];

//------------------------------------------------------------------------------

let gPercAnimations = [];

//------------------------------------------------------------------------------

let gAnimLast = new Date();

//------------------------------------------------------------------------------

const animPercPerMS = 0.05; // from 0% to 100% = 2s duration

//------------------------------------------------------------------------------

let gConfirmDialogCallback = (choice) => { toggleDialog("confirmDialog", false); };

//------------------------------------------------------------------------------
// FUNCTIONS
//------------------------------------------------------------------------------

//------------------------------------------------------------------------------
// data handling
//------------------------------------------------------------------------------

function findMaxID(objArr)
{
    let maxVal = -1;

    for (const o of objArr)
    {
        maxVal = Math.max(o.id, maxVal);
    }

    return maxVal;
}
//------------------------------------------------------------------------------

function findResp(id)
{
    for (const r of gResps)
    {
        if (r.id == id)
        {
            return r;
        }
    }

    return null;
}

//------------------------------------------------------------------------------

function findTeamMember(id)
{
    for (const t of gTeam)
    {
        if (t.id == id)
        {
            return t;
        }
    }

    return null;
}

//------------------------------------------------------------------------------

function updateAppData(data)
{
    gResps = data.resps;
    gTeam  = data.team;
    
    gRespsIDCounter = gResps.length > 0 ? findMaxID(gResps) + 1 : 0;
    gTeamIDCounter  = gTeam.length  > 0 ? findMaxID(gResps) + 1 : 0;
}

//------------------------------------------------------------------------------
// loading / saving
//------------------------------------------------------------------------------

function updateLocalStorage()
{
    const data = JSON.stringify({ "resps" : gResps, "team" : gTeam });
    
    localStorage.setItem("wdw-data-" + gSchemaVersion, data);
}

//------------------------------------------------------------------------------

function updateAppDataFromLocalStorage()
{
    const dataStr = localStorage.getItem("wdw-data-" + gSchemaVersion);

    if (dataStr)
    {
        updateAppData(JSON.parse(dataStr));
    }
}

//------------------------------------------------------------------------------
// ui utilities
//------------------------------------------------------------------------------

function animLoop()
{
    let needsUpdate = false;

    const animNow = new Date();
    const elapsed = animNow - gAnimLast;
    gAnimLast = animNow;

    const percElapsed = elapsed * animPercPerMS;

    for (let pa of gPercAnimations)
    {
        if (pa.curVal == pa.tgtVal)
            continue;

        if (pa.tgtVal > pa.srcVal)
        {
            pa.curVal += percElapsed;
            pa.curVal = Math.min(pa.curVal, pa.tgtVal);
        }
        else
        {
            pa.curVal -= percElapsed;
            pa.curVal = Math.max(pa.curVal, pa.tgtVal);
        }

        const percDispTxt = +(pa.curVal).toFixed(0) + "%";
        pa.elem.innerText = percDispTxt;

        if (pa.curVal != pa.tgtVal)
            needsUpdate = true;
    }

    if (needsUpdate)
    {
        requestAnimationFrame(animLoop);
    }    
    else
    {
        gPercAnimations = [];
    }
}

//------------------------------------------------------------------------------

function schedulePercAnimation(elem, srcPerc, tgtPerc)
{
    gPercAnimations.push(new NumberAnimation(elem, srcPerc, tgtPerc));

    // first animation? -> start animation loop
    if (gPercAnimations.length == 1)
    {   
        gAnimLast = new Date();

        requestAnimationFrame(animLoop);
    }
}

//------------------------------------------------------------------------------

function toggleDialog(elemID, toggleState)
{
    document.getElementById(elemID).style.visibility          = (toggleState ? "visible" : "hidden");
    document.getElementById("modalBackdrop").style.visibility = (toggleState ? "visible" : "hidden");
}

//------------------------------------------------------------------------------

function launchConfirmationDialog(text, callback)
{
    document.querySelector("#confirmDialogText").innerText = text;

    gConfirmDialogCallback = (choice) => {
        toggleDialog("confirmDialog", false);
        callback(choice);
    };

    toggleDialog("confirmDialog", true);
}

//------------------------------------------------------------------------------

function allowsDrop(elem)
{
    if (elem.classList.contains("dropTarget") &&
        elem.querySelectorAll(".draggableResp").length < 4)
    {
        return true;
    }

    return false;
}

//------------------------------------------------------------------------------

// minimalist way of adding things without a framework (avoiding "innerHTML")
function addToDOM(tree, parent)
{
    let elemType  = tree[0]; //example: "div"
    let attribs   = tree[1]; //example: { "class" : "separator" }
    let innerText = tree[2];
    let children  = tree[3]; //same format for children, if any
    
    // create element, setup inner text, setup attributes
    let e       = document.createElement(elemType);
    e.innerText = innerText;
    for (const [key, value] of Object.entries(attribs))
    {
        e.setAttribute(key, value);
    }
    
    parent.appendChild(e);

    // proceed with child tree
    for (child of children)
    {
        addToDOM(child, e);
    }

    return e;
}

//------------------------------------------------------------------------------

function constructScoreBarTree(title, id)
{
    return [
        "div", {"id" : id, "class" : "respHolderScoring"}, "", [
            ["span", {"class" : "respHolderScoringLabel"}, title, []],
            ["span", {"class" : "scoreBar"},"", [
                ["span", {"class" : "scoreBarLabel"}, "0", []]
            ]]
    ]];
}

//------------------------------------------------------------------------------

function initDropCallbacks(z)
{    
    z.ondragenter = (e) =>
    {
        if (!allowsDrop(e.target))
        {
            return false;
        }
      
        e.target.classList.add("flashingDropZone");
    };

    z.ondragover = (e) =>
    {
        if (!allowsDrop(e.target))
        {                
            return false;
        }
        
        e.preventDefault();            
        e.dataTransfer.dropEffect = "move"
    };

    z.ondragleave = (e) =>
    {            
        if (!allowsDrop(e.target))
        {
            return false;
        }

        e.target.classList.remove("flashingDropZone");
    };

    z.ondrop = (e) =>
    {
        if (!allowsDrop(e.target))
        {
            return false;
        }
                    
        e.target.classList.remove("flashingDropZone");

        const dropData = e.dataTransfer.getData("text");

        const respElem = document.getElementById(dropData);
        e.target.appendChild(respElem);

        // find and transfer responsibility
        const respID = Number(respElem.id.substring(1));
        const r      = findResp(respID);
        
        const teamMemberID = Number(e.target.parentElement.id.substring(1));
        const t = findTeamMember(teamMemberID);
        
        let tOld = (r.teamMemberID != -1 ? findTeamMember(r.teamMemberID) : null);
        
        transferResponsibility(r, t, tOld);
    };
}

//------------------------------------------------------------------------------
// ui callbacks
//------------------------------------------------------------------------------

function fileLoadSelected()
{
    const iElem = document.getElementById('uploadInputElem');
    const file = iElem.files[0];

    var reader = new FileReader();
    reader.readAsText(file,'UTF-8');
    
    reader.onload = readerEvent => {
        var fileContent = readerEvent.target.result;
        try
        {            
            updateAppData(JSON.parse(fileContent));
        }
        catch (err){
            console.err("Unable to read file - is it valid JSON?")
        }
    }
}

//------------------------------------------------------------------------------

function loadBtnClicked()
{ 
    const iElem = document.getElementById('uploadInputElem');
    iElem.click();
}

//------------------------------------------------------------------------------

function saveBtnClicked()
{    
    const storageObj = { "resps" : gResps, "team" : gTeam };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(storageObj));
    const dlAnchorElem = document.getElementById('downloadAnchorElem');
    dlAnchorElem.setAttribute("href",     dataStr     );
    dlAnchorElem.setAttribute("download", "wdw.json");
    dlAnchorElem.click();
}

//------------------------------------------------------------------------------

function respDialogXClicked()
{
    toggleDialog("createRespDialog", false);
}

//------------------------------------------------------------------------------

function createRespBtnClicked()
{
    createOrUpdateResponsibility(gRespsIDCounter);
    ++gRespsIDCounter;
    toggleDialog("createRespDialog", false);
    updateLocalStorage();
}

//------------------------------------------------------------------------------

function updateObjectiveBtnClicked(id)
{
    createOrUpdateResponsibility(id);
    toggleDialog("createRespDialog", false);
    updateLocalStorage();
}

//------------------------------------------------------------------------------

function newRespBtnClicked()
{
    const dialogElem = document.querySelector("#createRespDialog");
    dialogElem.querySelector(".dialogHeaderBarText").innerText = "New Objective";

    document.querySelector("#createObjectiveBtn").style.display = "inline";
    document.querySelector("#updateObjectiveBtn").style.display = "none";

    toggleDialog("createRespDialog", true);
}

//------------------------------------------------------------------------------

function objectiveDblClicked()
{
    const dialogElem = document.querySelector("#createRespDialog");
    dialogElem.querySelector(".dialogHeaderBarText").innerText = "View / Modify Objective";
    
    document.querySelector("#createObjectiveBtn").style.display = "none";
    document.querySelector("#updateObjectiveBtn").style.display = "inline";

    toggleDialog("createRespDialog", true);
}

//------------------------------------------------------------------------------

function teamMemberDialogXClicked()
{
    toggleDialog("createTeamMemberDialog", false);
}

//------------------------------------------------------------------------------

function createTeamMemberBtnClicked()
{
    createOrUpdateTeamMember(gTeamIDCounter);
    ++gTeamIDCounter;
    toggleDialog("createTeamMemberDialog", false);
    updateLocalStorage();
}

//------------------------------------------------------------------------------

function newTeamMemberBtnClicked()
{
    toggleDialog("createTeamMemberDialog", true);
}

//------------------------------------------------------------------------------

function respXClicked(respIDHTML)
{
    const rIDNum = Number(respIDHTML.substring(1));
    const r      = findResp(rIDNum);

    launchConfirmationDialog("Delete objective \"" + r.title + "\"?",
                             (choice) => {
                                // perform deletion
                                if (choice)
                                {
                                    if (r.teamMemberID != -1)
                                    {
                                        const t   = findTeamMember(r.teamMemberID);
                                        t.respIDs = t.respIDs.filter(e => e !== rIDNum);
                                        updateWorkloadScore(t);
                                    }

                                    document.getElementById(respIDHTML).remove();
                                    
                                    gResps = gResps.filter(resp => resp.id !== rIDNum);

                                    updateLocalStorage();
                                }
                             });
}

//------------------------------------------------------------------------------

function teamMemberXClicked(teamMemberIDHTML)
{
    const tIDNum = Number(teamMemberIDHTML.substring(1));
    const t      = findTeamMember(tIDNum);

    launchConfirmationDialog("Delete team member \"" + t.name + "\"?",
                             (choice) => {
                                // perform deletion
                                if (choice)
                                {
                                    // un-assign responsibilities (=> to backlog)
                                    for (const rID of t.respIDs)
                                    {
                                        const r = findResp(rID);
                                        r.teamMemberID = -1;

                                        const rElem = document.getElementById("r" + rID);
                                        document.getElementById("respCreationArea").appendChild(rElem);
                                    }

                                    document.getElementById(teamMemberIDHTML).remove();
                                    
                                    gTeam = gTeam.filter(tm => tm.id !== tIDNum);

                                    updateLocalStorage();
                                }
                             });
}

//------------------------------------------------------------------------------
// general
//------------------------------------------------------------------------------

function init()
{
    if (gResps.length == 0 && gTeam.length == 0)
    {
        updateAppDataFromLocalStorage();

        for (const r of gResps)
        {
            createOrUpdateResponsibility(r.id, r);
        }

        for (const t of gTeam)
        {
            createOrUpdateTeamMember(t.id, t);
        }
    }
}

//------------------------------------------------------------------------------

function createOrUpdateResponsibility(id, rData)
{
    const htmlID = "r" + id;
    let elem = document.querySelector(htmlID);

    const r = (rData ? rData : new Responsibility(gRespsIDCounter,
                                                  document.querySelector("#respNameInput").value,
                                                  "",
                                                  Number(document.querySelector("#respHoursInput").value)));

    // TODO: sanitizing steps should not be necessary once schema is stable
    r.weeklyHours = Number(r.weeklyHours);
    if (isNaN(r.weeklyHours)) { r.weeklyHours = 8};
    //

    const newRespHTML = 
    [
        "div", { "class" : "draggableResp", draggable: "true", id : htmlID, "ondblclick" : "objectiveDblClicked(" + id +")"}, "",
        [
            ["div", {"class" : "draggableRespX", "onclick" : `respXClicked('${htmlID}')`}, "X", []],
            ["div", {"class" : "draggableRespTitle"},    r.title,                    []],
            ["div", {"class" : "draggableRespSubtitle"}, r.weeklyHours + "h / week", []]
        ]
    ];

    //TODO: add functionality to store data from dialog into data model
    //TODO: add functionality update dialog from data model whenever it is brought up

    let whereToAdd = null;
    
    // responsibility doesn't exist yet -> create new one
    if (!elem)
    {   
        whereToAdd = document.querySelector("#respCreationArea");

        // new element just created
        if (!rData)
        {
            gResps.push(r);
        }
    }
    // TODO: MAKE EDITABLE LATER (CURRENTLY WE CAN ONLY RE-CREATE ITEMS)
    // responsibility exists -> update element
    else
    {
        const oldElem = document.querySelector(htmlID);
        whereToAdd = oldElem.parentElement;

        oldElem.remove();
    }

    const newHTMLElem = addToDOM(newRespHTML, whereToAdd);
    
    newHTMLElem.ondragstart = (e) =>
    {
        e.dataTransfer.setData("text", e.target.id);
        e.dataTransfer.effectAllowed = "move";        
    };
}

//------------------------------------------------------------------------------

function createOrUpdateTeamMember(id, tData)
{
    const htmlID = "t" + id;
    let elem = document.querySelector("#t" + id);
    
    // team member doesn't exist yet -> create new one
    if (!elem)
    {   
        const t = (tData ? tData : new TeamMember(gTeamIDCounter,
                                                  document.querySelector("#teamMemberNameInput").value,
                                                  document.querySelector("#teamMemberPositionInput").value,
                                                  [],
                                                  Number(document.querySelector("#teamMemberHoursInput").value),
                                                  0, 0));

        const newTeamMember = 
        [
            "div", { "class" : "respHolder", id : htmlID}, "",
            [
                ["div", {"class" : "respHolderX", "onclick" : `teamMemberXClicked('${htmlID}')`}, "X", []],
                ["div", {"class" : "respHolderTitle"},    t.name,  []],
                ["div", {"class" : "respHolderSubtitle"}, t.title, []],
                ["div", {"class" : "respHolderDropArea dropTarget"}, "",   []],
                //constructScoreBarTree("Focus:"),
                constructScoreBarTree("Assigned:", htmlID + "WorkloadBar")
            ]
        ];
        
        const newHTMLElem  = addToDOM(newTeamMember, document.querySelector("#teamCanvas"));
        const dropAreaElem = newHTMLElem.querySelector(".respHolderDropArea");

        // loaded already existing data?
        if (tData)
        {           
            // init responsibilities, if any
            for (const rID of t.respIDs)
            {
                const respElem = document.getElementById("r" + rID);
                if (respElem)
                {
                    dropAreaElem.appendChild(respElem);
                }
                else
                {
                    console.warn("Invalid data: cannot find responsibility with ID " + rID);
                }
            }

            updateWorkloadScore(t);
        }
        // new element just created
        else
        {
            gTeam.push(t);
        }
        
        initDropCallbacks(dropAreaElem);
    }
    // TODO: MAKE EDITABLE LATER (CURRENTLY WE CAN ONLY RE-CREATE ITEMS)
    // team member exists -> update element
    else
    {
        //...
    }
}

//------------------------------------------------------------------------------

function updateWorkloadScore(teamMember)
{
    // update workload score bar
    let hours = 0;

    for (const rID of teamMember.respIDs)
    {
        const r = findResp(rID);
        hours += r.weeklyHours;
    }

    const hoursPerc        = +(100 * (hours / teamMember.weeklyHourBudget)).toFixed(0);
    const scoreBarStyleStr = `linear-gradient(90deg,rgb(102, 117, 111) ${hoursPerc}%, black ${hoursPerc}%)`;

    const tElem = document.getElementById("t" + teamMember.id);

    tElem.querySelector(".scoreBarLabel").innerText   = hoursPerc;
    tElem.querySelector(".scoreBar").style.background = scoreBarStyleStr;
    
    // update responsibilities percentage display
    for (const rID of teamMember.respIDs)
    {
        const r     = findResp(rID);
        const rElem = tElem.querySelector("#r" + rID);
        
        // first time?
        if (!rElem.querySelector(".draggableRespSubtitle").innerText.endsWith("%"))
        {
            const perc  = +(100 * (r.weeklyHours / hours)).toFixed(0) + "%";
            rElem.querySelector(".draggableRespSubtitle").innerText = perc;
        }   
        // update -> animate this one  
        else
        {
            const displayElem = rElem.querySelector(".draggableRespSubtitle");
            const dElemTxt    = displayElem.innerText;

            schedulePercAnimation(displayElem,
                                  Number(dElemTxt.substring(0, dElemTxt.length - 1)),
                                  100 * (r.weeklyHours / hours));
        }   
    }        
}

//------------------------------------------------------------------------------

function transferResponsibility(resp, teamMember, teamMemberOld)
{
    if (teamMemberOld === teamMember)
    {
        console.warn("Inconsistent state: responsibility transferred to same team member.");
        teamMemberOld = null;
    }

    resp.teamMemberID = teamMember.id;

    teamMember.respIDs.push(resp.id);
    updateWorkloadScore(teamMember);

    if (teamMemberOld)
    {
        teamMemberOld.respIDs = teamMemberOld.respIDs.filter(e => e !== resp.id);
        updateWorkloadScore(teamMemberOld);
    }
    
    // save updated state to local storage
    updateLocalStorage();
}

//------------------------------------------------------------------------------
