//TODO:
// TRASH BUTTON TEAM
// TRASH BUTTON RESP
// EDIT BUTTON TEAM
// EDIT BUTTON RESP

const gSchemaVersion = "0.1-dev";

//------------------------------------------------------------------------------
// data structures
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
// global variables
//------------------------------------------------------------------------------

let gRespsIDCounter = 0;

//------------------------------------------------------------------------------

let gTeamIDCounter = 0;

//------------------------------------------------------------------------------

let gResps = [];

//------------------------------------------------------------------------------

let gTeam = [];

//------------------------------------------------------------------------------

let gConfirmDialogCallback = (choice) => { toggleDialog("confirmDialog", false); };

//------------------------------------------------------------------------------
// functions
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
        const data = JSON.parse(dataStr);

        gResps = data.resps;
        gTeam  = data.team;
        
        gRespsIDCounter = gResps.length > 0 ? findMaxID(gResps) + 1 : 0;
        gTeamIDCounter  = gTeam.length  > 0 ? findMaxID(gResps) + 1 : 0;
    }
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
}

//------------------------------------------------------------------------------

function newRespBtnClicked()
{
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
}

//------------------------------------------------------------------------------

function newTeamMemberBtnClicked()
{
    toggleDialog("createTeamMemberDialog", true);
}

//------------------------------------------------------------------------------

function respXClicked(respID)
{
    const rIDNum = Number(respID.substring(1));
    const r      = findResp(rIDNum);

    launchConfirmationDialog("Delete responsibility \"" + r.title + "\"?",
                             (choice) => {
                                // perform deletion
                                if (choice)
                                {
                                    if (r.teamMemberID != -1)
                                    {
                                        const t   = findTeamMember(r.teamMemberID);
                                        t.respIDs = t.respIDs.filter(e => e !== rIDNum);
                                    }

                                    document.getElementById(respID).remove();
                                    
                                    gResps = gResps.filter(resp => resp.id !== rIDNum);

                                    updateLocalStorage();
                                }
                             });
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

        // adapt data model & scores            
        if (e.target.classList.contains("respHolderDropArea"))
        {
            const teamMemberID = Number(e.target.parentElement.id.substring(1));
            const t = findTeamMember(teamMemberID);
            
            // find and transfer responsibility
            const respID = Number(respElem.id.substring(1));
            const r      = findResp(respID);
            
            let tOld = (r.teamMemberID != -1 ? findTeamMember(r.teamMemberID) : null);

            if (tOld === t)
            {
                console.warn("Inconsistent state: responsibility transferred to same team member.");
                tOld = null;
            }

            t.respIDs.push(respID);            
            if (tOld)
            {
                tOld.respIDs = tOld.respIDs.filter(e => e !== respID);
            }
            
            r.teamMemberID = teamMemberID;

            //TODO: implement scoring
            //const wlBarID = "t" + teamMemberID + "WorkloadBar";
            //... e.target.parent.querySelectorAll(".respHolderScoring");

            updateLocalStorage();
        }
    };
}

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

function createOrUpdateResponsibility(id, rData)
{
    const htmlID = "r" + id;
    let elem = document.querySelector(htmlID);

    const r = (rData ? rData : new Responsibility(gRespsIDCounter,
                                                  document.querySelector("#respNameInput").value,
                                                  "",
                                                  document.querySelector("#respHoursInput").value + "h / week"));

    const newRespHTML = 
    [
        "div", { "class" : "draggableResp", draggable: "true", id : htmlID}, "",
        [
            ["div", {"class" : "draggableRespX", "onclick" : `respXClicked('${htmlID}')`}, "X", []],
            ["div", {"class" : "draggableRespTitle"},    r.title,       []],
            ["div", {"class" : "draggableRespSubtitle"}, r.weeklyHours, []]
        ]
    ];

    const newHTMLElem = addToDOM(newRespHTML, document.querySelector("#respCreationArea"));

    newHTMLElem.ondragstart = (e) =>
    {
        e.dataTransfer.setData("text", e.target.id);
        e.dataTransfer.effectAllowed = "move";        
    };
    
    // responsibility doesn't exist yet -> create new one
    if (!elem)
    {   
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
        //...
    }
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
                                                  document.querySelector("#teamMemberHoursInput").value,
                                                  0, 0));

        const newTeamMember = 
        [
            "div", { "class" : "respHolder", id : htmlID}, "",
            [
                ["div", {"class" : "respHolderTitle"},    t.name,  []],
                ["div", {"class" : "respHolderSubtitle"}, t.title, []],
                ["div", {"class" : "respHolderDropArea dropTarget"}, "",   []],
                //constructScoreBarTree("Focus:"),
                //constructScoreBarTree("Workload:", htmlID + "WorkloadBar")
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
