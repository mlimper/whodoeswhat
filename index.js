//TODO:
// TRASH BUTTON TEAM
// TRASH BUTTON RESP
// EDIT BUTTON TEAM
// EDIT BUTTON RESP

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
    }
}

//------------------------------------------------------------------------------

class TeamMember
{
    constructor(id, name, title, responsibilities, weeklyHourBudget,
                focusScore, workloadScore)
    {
        this.id               = id;
        this.name             = name;
        this.title            = title;
        this.responsibilities = responsibilities;
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

let resps = [];

//------------------------------------------------------------------------------

let team = [];

//------------------------------------------------------------------------------
// functions
//------------------------------------------------------------------------------

function findTeamMember(id)
{
    for (const t of team)
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
}

//------------------------------------------------------------------------------

function init()
{
    // drag start behavior
    const draggables = document.querySelectorAll(".draggableResp");

    for (const d of draggables)
    {
        d.ondragstart = (e) =>
        {
            e.dataTransfer.setData("text", e.target.id);
            e.dataTransfer.effectAllowed = "move";        
        };
    }

    // drop behavior
    const dropZones = document.querySelectorAll(".respHolderDropArea");
    
    for (const z of dropZones)
    {
        z.ondragenter = (e) =>
        {
            if (!allowsDrop(e.target))
            {
                return false;
            }
            
            //e.preventDefault();
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

            //e.preventDefault();
            e.target.classList.remove("flashingDropZone");
        };

        z.ondrop = (e) =>
        {
            if (!allowsDrop(e.target))
            {
                return false;
            }
            
            //e.preventDefault();
            e.target.classList.remove("flashingDropZone");

            const dropData = e.dataTransfer.getData("text");
            const respElem = document.getElementById(dropData)
            e.target.appendChild(respElem);

            // adapt scores            
            if (e.target.classList.contains("respHolderDropArea"))
            {
                const teamMemberID = Number(e.target.parentElement.id.substring(2));
                const t = findTeamMember(teamMemberID);
                
                const wlBarID = "#t" + teamMemberID + "WorkloadBar";

                //TODO: find and transfer responsibility
                //t.responsibilities.push(...);
            }
            
            //... e.target.parent.querySelectorAll(".respHolderScoring");
        };
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

function createOrUpdateResponsibility(id)
{
    const htmlID = "#r" + id;
    let elem = document.querySelector(htmlID);

    // responsibility doesn't exist yet -> create new one
    if (!elem)
    {   
        let what     = document.querySelector("#respNameInput").value;
        let workload = document.querySelector("#respHoursInput").value + "h / week";

        const r = new Responsibility(gRespsIDCounter, what, workload);
        resps.push(r);

        const newRespHTML = 
        [
            "div", { "class" : "draggableResp", draggable: "true", id : htmlID}, "",
            [
                ["div", {"class" : "draggableRespTitle"},    what,      []],
                ["div", {"class" : "draggableRespSubtitle"}, workload,  []]
            ]
        ];

        addToDOM(newRespHTML, document.querySelector("#respCreationArea"));

        //TODO: DIRTY - SHOULD JUST ADD THE NECESSARY CALLBACKS
        init();
    }
    // TODO: MAKE EDITABLE LATER (CURRENTLY WE CAN ONLY RE-CREATE ITEMS)
    // responsibility exists -> update element
    else
    {
        //...
    }
}

//------------------------------------------------------------------------------

function createOrUpdateTeamMember(id)
{
    const htmlID = "#t" + id;
    let elem = document.querySelector("#t" + id);
    
    // team member doesn't exist yet -> create new one
    if (!elem)
    {   
        let who      = document.querySelector("#teamMemberNameInput").value;
        let title    = document.querySelector("#teamMemberPositionInput").value;
        let capacity = document.querySelector("#teamMemberHoursInput").value;

        const t = new TeamMember(gTeamIDCounter, who, title, [], capacity, 0, 0);
        team.push(t);

        const newTeamMember = 
        [
            "div", { "class" : "respHolder", id : htmlID}, "",
            [
                ["div", {"class" : "respHolderTitle"},    who,   []],
                ["div", {"class" : "respHolderSubtitle"}, title, []],
                ["div", {"class" : "respHolderDropArea dropTarget"}, "",   []],
                //constructScoreBarTree("Focus:"),
                //constructScoreBarTree("Workload:", htmlID + "WorkloadBar")
            ]
        ];

        addToDOM(newTeamMember, document.querySelector("#teamCanvas"));

        //TODO: DIRTY - SHOULD JUST ADD THE NECESSARY CALLBACKS
        init();
    }
    // TODO: MAKE EDITABLE LATER (CURRENTLY WE CAN ONLY RE-CREATE ITEMS)
    // team member exists -> update element
    else
    {
        //...
    }
}

//------------------------------------------------------------------------------
