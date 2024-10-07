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

function newRespButtonClicked()
{
    createOrUpdateResponsibility(gRespsIDCounter);
    ++gRespsIDCounter;
}

//------------------------------------------------------------------------------

function newTeamMemberButtonClicked()
{
    createOrUpdateTeamMember(gTeamIDCounter);
    ++gTeamIDCounter;
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
            const RespElem = document.getElementById(dropData)
            e.target.appendChild(RespElem);

            //TODO: adapt scores
            //... e.target.parent.querySelectorAll(".respHolderScoring");
        };
    }
}

//------------------------------------------------------------------------------

function constructScoreBarTree(title)
{
    return [
        "div", {"class" : "respHolderScoring"}, "", [
            ["span", {"class" : "respHolderScoringLabel"}, title, []],
            ["span", {"class" : "scoreBar"},"", [
                ["span", {"class" : "scoreBarLabel"}, "0", []]
            ]]
    ]];
}

//------------------------------------------------------------------------------

function createOrUpdateResponsibility(id)
{
    //TODO: query attribs, update JS object

    const htmlID = "#r" + id;
    let elem = document.querySelector(htmlID);

    // responsibility doesn't exist yet -> create new one
    if (!elem)
    {    
        const newResp = 
        [
            "div", { "class" : "draggableResp", draggable: "true", id : htmlID}, "",
            [
                ["div", {"class" : "draggableRespTitle"},    "Accounting: Invoices", []],
                ["div", {"class" : "draggableRespSubtitle"}, "4h / week",            []]
            ]
        ];

        addToDOM(newResp, document.querySelector("#respCreationArea"));

        //TODO: DIRTY - SHOULD JUST ADD THE NECESSARY CALLBACKS
        init();
    }
    // responsibility exists -> update element
    else
    {
        //...
    }
}

//------------------------------------------------------------------------------

function createOrUpdateTeamMember(id)
{
    //TODO: query attribs, update JS object

    const htmlID = "#t" + id;
    let elem = document.querySelector("#t" + id);

    // team member doesn't exist yet -> create new one
    if (!elem)
    {   
        const newTeamMember = 
        [
            "div", { "class" : "respHolder", id : htmlID}, "",
            [
                ["div", {"class" : "respHolderTitle"},    "John A. Doe",   []],
                ["div", {"class" : "respHolderSubtitle"}, "Head of Stuff", []],
                ["div", {"class" : "respHolderDropArea dropTarget"}, "",   []],
                constructScoreBarTree("Focus:"),
                constructScoreBarTree("Workload:")
            ]
        ];

        addToDOM(newTeamMember, document.querySelector("#teamCanvas"));

        //TODO: DIRTY - SHOULD JUST ADD THE NECESSARY CALLBACKS
        init();
    }
    // team member exists -> update element
    else
    {
        //...
    }
}

//------------------------------------------------------------------------------
