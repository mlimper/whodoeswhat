
//------------------------------------------------------------------------------

function newTaskButtonClicked()
{

}

//------------------------------------------------------------------------------

function allowsDrop(elem)
{
    if (elem.classList.contains("dropTarget") &&
        elem.querySelectorAll(".draggableTask").length < 4)
    {
        return true;
    }

    return false;
}

//------------------------------------------------------------------------------

function init()
{
    // drag start behavior
    const draggables = document.querySelectorAll(".draggableTask");

    for (const d of draggables)
    {
        d.ondragstart = (e) =>
        {
            e.dataTransfer.setData("text", e.target.id);
            e.dataTransfer.effectAllowed = "move";        
        };
    }

    // drop behavior
    const dropZones = document.querySelectorAll(".taskHolderDropArea");
    
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
            const taskElem = document.getElementById(dropData)
            e.target.appendChild(taskElem);

            //TODO: adapt scores
            //... e.target.parent.querySelectorAll(".taskHolderScoring");
        };
    }
}

//------------------------------------------------------------------------------
