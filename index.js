//TODOS:
// EDIT BUTTON TEAM
// pw protected files? (https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt)

const gSchemaVersion = "0.1-dev";

//------------------------------------------------------------------------------
// DATA STRUCTURES
//------------------------------------------------------------------------------

class Objective
{
    constructor(id, title, weeklyHours, details)
    {
      this.id          = id;
      this.title       = title;
      this.weeklyHours = weeklyHours;
      this.teamMemberID  = -1;
      this.details       = details;
    }
}

//------------------------------------------------------------------------------

class TeamMember
{
    constructor(id, name, title, objectiveIDs, weeklyHourBudget,
                focusScore, workloadScore)
    {
        this.id               = id;
        this.name             = name;
        this.title            = title;
        this.objectiveIDs     = objectiveIDs;
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

let gObjectivesIDCounter = 0;

//------------------------------------------------------------------------------

let gTeamIDCounter = 0;

//------------------------------------------------------------------------------

let gObjectives = [];

//------------------------------------------------------------------------------

let gTeam = [];

//------------------------------------------------------------------------------

let gPercAnimations = [];

//------------------------------------------------------------------------------

let gAnimLast = new Date();

//------------------------------------------------------------------------------

const animPercPerMS = 0.025; // from 0% to 100% = 4s duration

//------------------------------------------------------------------------------

let gEditingObjectiveID = -1;

//------------------------------------------------------------------------------

let gViewMode = false;

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

function findObjective(id)
{
    for (const r of gObjectives)
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

function isNumber(val)
{
    return (typeof val === 'number' && isFinite(val));
}

//------------------------------------------------------------------------------

function isString(val)
{
    return (typeof val === 'string' || val instanceof String)
}

//------------------------------------------------------------------------------

function updateAppData(data)
{
    // sanity checks / sanitization: objectives
    const oList    = data.resps;
    //let validOList = [];
    //...
    let validOList = oList;

    // extra sanitization (shouldn't be necessary after this works):
    //--
    for (const o of oList)
    {
        let owner = "";
        for (const t of data.team)
        {
            if (t.objectiveIDs.includes(o.id))
            {
                if (owner != "")
                {
                    console.log.warn("Found objective " + o.title + " with ID " + o.id +
                                     " assigned to owner \"" + t.name + "\", but also to owner \"" + owner + "\".");
                    break;
                }
                owner = t.name;
            }
        }
    }
    //--

    // sanity checks / sanitization: team members
    const tList    = data.team;
    let validTList = [];
    for (let i = 0; i < tList.length; ++i)
    {
        // extra sanitization (shouldn't be necessary after this works):
        //--
        if (isString(tList[i]["weeklyHourBudget"]))
        {
            tList[i]["weeklyHourBudget"] = Number.parseInt(tList[i]["weeklyHourBudget"]);
        }
        //--

        const validID            = isNumber(tList[i]["id"]);
        const validName          = isString(tList[i]["name"]);
        const validTitle         = isString(tList[i]["title"]);
        const validObjIDs        = Array.isArray(tList[i]["objectiveIDs"]);
        const validHoursBudget   = isNumber(tList[i]["weeklyHourBudget"]);
        const validFocusScore    = isNumber(tList[i]["focusScore"]);
        const validWorkloadScore = isNumber(tList[i]["workloadScore"]);

        if (!validID || !validName || ! validTitle || !validObjIDs || ! validHoursBudget || !validFocusScore || ! validWorkloadScore)
        {
            console.warn("A team member entry to be loaded with name \"" + tList[i]["name"] + "\" didn't pass validation, skipping.");
            continue;
        }
        
        validTList.push(tList[i]);

        const tmName = tList[i]["name"];

        let cleanOList = [];
        for (const oID of tList[i]["objectiveIDs"])
        {
            if (!isNumber(oID))
            {
                console.warn("Team member \"" + tmName + "\" has invalid objective assigned, using a NaN ID.");
                continue;
            }

            let found = false;

            for (const o of validOList)
                if (o.id == oID)
                {
                    found = true;
                    break;
                }

            if (found)
                cleanOList.push(oID);
            else
                console.warn("Team member \"" + tmName + "\" has objective with ID " + oID + ", but no such objective was found.");
        }        
    }

    gObjectives = validOList;
    gTeam       = validTList;
    
    gObjectivesIDCounter = gObjectives.length > 0 ? findMaxID(gObjectives) + 1 : 0;
    gTeamIDCounter       = gTeam.length  > 0 ? findMaxID(gObjectives) + 1 : 0;
}

//------------------------------------------------------------------------------
// loading / saving via local storage or URL param
//------------------------------------------------------------------------------

async function loadFromURLParams()
{
    const queryString = window.location.search;
    const urlParams   = new URLSearchParams(queryString);

    const viewResource = urlParams.get('viewResource');

    if (viewResource)
    {
        try
        {
            const response = await fetch(viewResource);            
            if (response.ok)
            {
                const data = await response.json();
                updateAppData(data);
                return true;
            }
            else
            {
                throw new Error('Invalid response for HTTP request.');
            }
        }
        catch (err)
        {
            console.error("ERROR: unable to load valid JSON from file \"" + viewResource + "\"");
            return false;
        }
    }
    
    return false;
}

//------------------------------------------------------------------------------

function updateLocalStorage()
{
    const data = JSON.stringify({ "resps" : gObjectives, "team" : gTeam });
    
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

        // find and transfer objective
        const obID = Number(respElem.id.substring(1));
        const r    = findObjective(obID);
        
        const teamMemberID = Number(e.target.parentElement.id.substring(1));
        const t = findTeamMember(teamMemberID);
        
        let tOld = (r.teamMemberID != -1 ? findTeamMember(r.teamMemberID) : null);
        
        transferObjective(r, t, tOld);
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
            const data = JSON.parse(fileContent);

            updateAppData(data);            
            updateLocalStorage();

            clearUIContent();
            createUIContent();
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
    const storageObj = { "resps" : gObjectives, "team" : gTeam };

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

function createObjectiveBtnClicked()
{
    // create data model
    let uiDetails = [];
    for (let idx = 1; idx <= 6; ++idx)
    {
        uiDetails.push(document.querySelector("#objectiveRespInput" + idx).value);
    }
    const ob = new Objective(gObjectivesIDCounter,
                             document.querySelector("#respNameInput").value,
                             Number(document.querySelector("#respHoursInput").value),
                             uiDetails);    
    gObjectives.push(ob);
    ++gObjectivesIDCounter;

    // create UI
    createObjectiveUI(ob);
    
    // update data in local storage
    updateLocalStorage();

    // hide dialog
    toggleDialog("createRespDialog", false);
}

//------------------------------------------------------------------------------

function updateObjectiveBtnClicked()
{
    // update data model
    const ob = findObjective(gEditingObjectiveID);

    ob.title       = document.querySelector("#respNameInput").value;
    ob.weeklyHours = Number(document.querySelector("#respHoursInput").value);

    let uiDetails = [];
    for (let idx = 1; idx <= 6; ++idx)
    {
        uiDetails.push(document.querySelector("#objectiveRespInput" + idx).value);
    }
    ob.details = uiDetails;

    // update UI
    updateObjectiveUI(gEditingObjectiveID, ob);
    if (ob.teamMemberID != -1)
    {
        updateWorkloadScore(findTeamMember(ob.teamMemberID));
    }    

    // update data in local storage
    updateLocalStorage();

    // hide dialog
    toggleDialog("createRespDialog", false);
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

function objectiveDblClicked(id)
{
    const dialogElem = document.querySelector("#createRespDialog");

    const dialogBarTxt = (gViewMode ? "View Objective" : "View / Modify Objective");    

    dialogElem.querySelector(".dialogHeaderBarText").innerText = dialogBarTxt;    
    dialogElem.querySelector("#createObjectiveBtn").style.display = "none";
    dialogElem.querySelector("#updateObjectiveBtn").style.display = "inline";

    // in read-only mode, hide all elements for editing,
    // and disable the ones that aren't supposed to be editable (but should still be shown)
    if (gViewMode)
    {
        dialogElem.querySelectorAll(".editableOnly").forEach(     (elem) => { elem.style.display = "none"; });
        dialogElem.querySelectorAll(".disableInViewMode").forEach((elem) => { elem.readOnly      = true;  });
    }

    // update dialog from data model of selected objective
    const ob = findObjective(id);
    let idx  = 1;
    for (const d of ob.details)
    {
        dialogElem.querySelector("#objectiveRespInput" + idx).value = d;
        ++idx;
    }    
    document.querySelector("#respNameInput").value  = ob.title;    
    document.querySelector("#respHoursInput").value = ob.weeklyHours;

    gEditingObjectiveID = id;

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
    // create data model    
    const tm = new TeamMember(gTeamIDCounter,
                              document.querySelector("#teamMemberNameInput").value,
                              document.querySelector("#teamMemberPositionInput").value,
                              [],
                              Number(document.querySelector("#teamMemberHoursInput").value),
                              0, 0);
    gTeam.push(tm);
    ++gTeamIDCounter;    

    // create UI
    createTeamMemberUI(tm);
    
    // update data in local storage
    updateLocalStorage();

    // hide dialog
    toggleDialog("createTeamMemberDialog", false);
}

//------------------------------------------------------------------------------

function newTeamMemberBtnClicked()
{
    toggleDialog("createTeamMemberDialog", true);
}

//------------------------------------------------------------------------------

function objectiveXClicked(idStr)
{ 
    const id = Number.parseInt(idStr);
    const ob = findObjective(id);

    launchConfirmationDialog("Delete objective \"" + ob.title + "\"?",
                             (choice) => {
                                // perform deletion
                                if (choice)
                                {
                                    if (ob.teamMemberID != -1)
                                    {
                                        const tm = findTeamMember(ob.teamMemberID);
                                        tm.objectiveIDs = tm.objectiveIDs.filter(e => e !== id);
                                        updateWorkloadScore(tm);
                                    }

                                    document.getElementById("o" + id).remove();
                                    
                                    gObjectives = gObjectives.filter(o => o.id !== id);

                                    updateLocalStorage();
                                }
                             });
}

//------------------------------------------------------------------------------

function teamMemberXClicked(id)
{
    const tm = findTeamMember(id);

    launchConfirmationDialog("Delete team member \"" + tm.name + "\"?",
                             (choice) => {
                                // perform deletion
                                if (choice)
                                {
                                    // un-assign objectives (=> to backlog)
                                    for (const obID of tm.objectiveIDs)
                                    {
                                        const ob = findObjective(obID);
                                        ob.teamMemberID = -1;

                                        const obElem = document.getElementById("o" + obID);
                                        document.getElementById("respCreationArea").appendChild(obElem);
                                    }

                                    document.getElementById("t" + id).remove();
                                    
                                    gTeam = gTeam.filter(t => t.id !== id);

                                    updateLocalStorage();
                                }
                             });
}

//------------------------------------------------------------------------------

function copyTMToClipboard(id)
{
    const t = findTeamMember(id);

    let clipBoardStrHTML = "";
    let clipBoardStrTxt  = "";

    const writeObjective = (obID) => {
        let strHTML = "";
        let strTxt  = "";

        const ob = findObjective(obID);

        strHTML += `<h2>${ob.title}</h2>`;
        strTxt  += `## ${ob.title}\n`;
        strHTML += `<i>${ob.weeklyHours} h / week (average)</i>`;
        strTxt  += `* ${ob.weeklyHours} h / week (average)`;

        strHTML += "<ul>";
        strTxt  += "\n";
        for (const d of ob.details)
        {
            if (d != "")
            {
                strHTML += `<li>${d}</li>`;   
                strTxt  += `* ${d}\n`;
            }            
        }
        strHTML += "</ul>";        
        strHTML += "<br>";
        strTxt  += "\n";

        return [strHTML, strTxt];
    };

    clipBoardStrHTML += `<h1>Goals for ${t.name}<br>(${t.title})</h1>`;
    clipBoardStrTxt  += `# Goals for ${t.name} (${t.title})\n`;

    for (const obID of t.objectiveIDs)
    {
        const strings = writeObjective(obID);

        clipBoardStrHTML += strings[0];
        clipBoardStrTxt  += strings[1];
    }

    const blobHtml = new Blob([clipBoardStrHTML], { type: "text/html"  });
    const blobText = new Blob([clipBoardStrTxt],  { type: "text/plain" });
    const data = [new ClipboardItem({      
        ["text/html"]:  blobHtml,
        ["text/plain"]: blobText,
    })];

    navigator.clipboard.write(data).then(
        () => {alert('Copied to clipboard!')},
        () => {}
    );
}

//------------------------------------------------------------------------------
// general
//------------------------------------------------------------------------------

async function init()
{
    // check URL parameters first
    const loadedFromURL = await loadFromURLParams();    
    if (loadedFromURL)
    {
        gViewMode = true;

        const rElem = document.querySelector(':root');
        rElem.style.setProperty("--creation-panel-width", "0.1rem");
    }
    // if loading via URL parameters not successful, init from local storage
    else
    {
        updateAppDataFromLocalStorage();
    }

    createUIContent();
}

//------------------------------------------------------------------------------

function clearUIContent()
{
    document.querySelector("#respCreationArea").innerHTML = "";
    document.querySelector("#teamCanvas").innerHTML       = "";
}

//------------------------------------------------------------------------------

function createUIContent()
{
    for (const r of gObjectives)
    {            
        // TODO: sanitizing steps should not be necessary once schema is stable            
        r.weeklyHours = Number(r.weeklyHours);
        if (isNaN(r.weeklyHours)) { r.weeklyHours = 8; };
        if (!r.details) { r.details = ["","","","","",""]; };
        //
        createObjectiveUI(r);
    }

    for (const tm of gTeam)
    {
        // TODO: sanitizing steps should not be necessary once schema is stable 
        if (tm.respIDs) { tm.objectiveIDs = tm.respIDs; }
        delete tm.respIDs;
        tm.objectiveIDs = tm.objectiveIDs.sort().filter(function(itm, pos, ary) {
            return !pos || itm != ary[pos - 1];
        });
        tm.objectiveIDs = tm.objectiveIDs.filter((obID) => {
            const ob = findObjective(obID);
            return (ob.teamMemberID == tm.id);
        });
        //
        createTeamMemberUI(tm);
    }
}

//------------------------------------------------------------------------------

function updateObjectiveUI(id, objective)
{   
    const elem = document.getElementById("o" + id);

    elem.querySelector(".draggableRespTitle").innerText    = objective.title;
    elem.querySelector(".draggableRespSubtitle").innerText = objective.weeklyHours + "h / week";
}

//------------------------------------------------------------------------------

function createObjectiveUI(ob)
{
    // add new element to DOM
    const newRespHTML = 
    [
        "div", { class : "draggableResp", draggable : "true", id : "o" + ob.id, ondblclick : "objectiveDblClicked(" + ob.id +")"}, "",
        [
            ["button", {"class" : "draggableRespX", "onclick" : `objectiveXClicked('${ob.id}')`}, "X", []],
            ["div",    {"class" : "draggableRespTitle"},    ob.title,                    []],
            ["div",    {"class" : "draggableRespSubtitle"}, ob.weeklyHours + "h / week", []]
        ]
    ];
    const newHTMLElem = addToDOM(newRespHTML, document.querySelector("#respCreationArea"));    

    // setup drag event listener
    newHTMLElem.ondragstart = (e) =>
    {
        if (gViewMode)
        {
            return false;
        }
        e.dataTransfer.setData("text", e.target.id);
        e.dataTransfer.effectAllowed = "move";        
    };
}

//------------------------------------------------------------------------------

function createTeamMemberUI(tm)
{
    const htmlID = "t" + tm.id;
  
    const newTeamMember = 
    [
        "div", { class : "respHolder", id : htmlID}, "",
        [
            ["div", {"class" : "tmTopBar"}, "", [
                ["button", {"class" : "tmClipboardBtn", "onclick" : `copyTMToClipboard(${tm.id})`}, "",  [
                    ["div", {"class" : "tmClipboardBtnIcon"}, "", []]
                ]],
                ["button", {"class" : "respHolderX",    "onclick" : `teamMemberXClicked(${tm.id})`}, "", [
                    ["div", {"class" : "tmXBtnIcon"}, "X", []]
                ]]
            ]],
            ["div", {"class" : "respHolderTitle"},    tm.name,  []],
            ["div", {"class" : "respHolderSubtitle"}, tm.title, []],
            ["div", {"class" : "respHolderDropArea dropTarget"}, "",   []],
            //constructScoreBarTree("Focus:"),
            constructScoreBarTree("Assigned:", htmlID + "WorkloadBar")
        ]
    ];
    const newHTMLElem  = addToDOM(newTeamMember, document.querySelector("#teamCanvas"));
    const dropAreaElem = newHTMLElem.querySelector(".respHolderDropArea");

    // init objectives, if any
    for (const obID of tm.objectiveIDs)
    {
        const obElem = document.getElementById("o" + obID);
        if (obElem)
        {
            dropAreaElem.appendChild(obElem);
        }
        else
        {
            console.warn("Invalid data: cannot find objective with ID " + obID);
        }
    }

    updateWorkloadScore(tm);
        
    initDropCallbacks(dropAreaElem);
}

//------------------------------------------------------------------------------

function updateWorkloadScore(teamMember)
{
    // update workload score bar
    let hours = 0;

    for (const rID of teamMember.objectiveIDs)
    {
        const r = findObjective(rID);
        hours += r.weeklyHours;
    }

    const hoursPerc        = +(100 * (hours / teamMember.weeklyHourBudget)).toFixed(0);
    const scoreBarStyleStr = `linear-gradient(90deg,rgb(102, 117, 111) ${hoursPerc}%, black ${hoursPerc}%)`;

    const tElem = document.getElementById("t" + teamMember.id);

    tElem.querySelector(".scoreBarLabel").innerText   = hoursPerc;
    tElem.querySelector(".scoreBar").style.background = scoreBarStyleStr;
    
    // update objectives percentage display
    for (const rID of teamMember.objectiveIDs)
    {
        const r     = findObjective(rID);
        const rElem = tElem.querySelector("#o" + rID);
        
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

function transferObjective(ob, teamMember, teamMemberOld)
{
    if (teamMemberOld === teamMember)
    {
        console.warn("Inconsistent state: objective transferred to same team member.");
        teamMemberOld = null;
    }

    ob.teamMemberID = teamMember.id;

    teamMember.objectiveIDs.push(ob.id);
    updateWorkloadScore(teamMember);

    if (teamMemberOld)
    {
        teamMemberOld.objectiveIDs = teamMemberOld.objectiveIDs.filter(e => e !== ob.id);
        updateWorkloadScore(teamMemberOld);
    }
    
    // save updated state to local storage
    updateLocalStorage();
}

//------------------------------------------------------------------------------
