function initSketchfab() {
    const version = "1.12.1";
    let uid = ""; // Default UID

    const urlParams = new URLSearchParams(window.location.search);
    let autoSpin = 0.0;

    if (urlParams.has("autospin")) {
        autoSpin = urlParams.get("autospin");
    }

    // Get UID from URL parameters if available
    if (urlParams.has("id")) {
        uid = urlParams.get("id");
    }

    const iframe = document.getElementById("api-frame");
    const client = new window.Sketchfab(version, iframe);

    const error = function () {
        console.error("Sketchfab API error");
        alert("Error loading the model. Please check the UID and try again.");
    };

    let idxNodes = 0;
    const myNodesByNameFromMap = {};
    const officialNodes = [];

    const success = function (api) {
        api.start(function () {
            api.addEventListener("viewerready", function () {
                api.getNodeMap(function (err, nodes) {
                    if (!err) {
                        for (const instanceID in nodes) {
                            const node = nodes[instanceID];
                            let name = node.name;
                            if (!name) name = "noname_" + idxNodes++;
                            myNodesByNameFromMap[name] = node;
                        }

                        let rootNodeTree = myNodesByNameFromMap["RootNode"];

                        if (rootNodeTree === undefined) {
                            rootNodeTree = myNodesByNameFromMap["root"];
                        }

                        if (rootNodeTree != undefined) {
                            recurse(rootNodeTree, rootNodeTree.children.length, 0);
                            generateTree();
                        }

                        const toggleButtons = document.getElementsByClassName("Show");
                        for (let i = 0; i < toggleButtons.length; i++) {
                            toggleButtons[i].addEventListener("click", function () {
                                toggleVisibility(api, this);
                            });
                        }
                    }
                });
            });
        });
    };

    // Function to initialize the viewer with a new UID
    const initViewer = (newUid) => {
        uid = newUid;
        
        // Clear the navigation tree
        const navTree = document.getElementById("navTree");
        navTree.innerHTML = '';
        
        // Show loading state
        navTree.innerHTML = '<div class="loading">Loading navigation tree...</div>';
        
        client.init(uid, {
            success: success,
            error: error,
            autostart: 1,
            preload: 1,
            autospin: autoSpin,
            transparent: 1
        });
    };

    // Handle form submission
    const uidForm = document.getElementById("uidForm");
    const uidInput = document.getElementById("uidInput");

    uidForm.addEventListener("submit", function(e) {
        e.preventDefault();
        const newUid = uidInput.value.trim();
        if (newUid) {
            initViewer(newUid);
            // Update URL without reloading the page
            const newUrl = new URL(window.location);
            newUrl.searchParams.set("id", newUid);
            window.history.pushState({}, "", newUrl);
        }
    });

    // Initialize with default or URL parameter UID
    if (uid) {
        initViewer(uid);
        uidInput.value = uid;
    }

    function initGui() {
        const controls = document.getElementById("navTree");
        let buttonsText = "";
        buttonsText += '<button id="screenshot"></button>';
        controls.innerHTML = buttonsText;
    }

    function generateTree() {
        const tree = unflatten(officialNodes);

        const navTree = document.getElementById("navTree");
        navTree.innerHTML = ''; // Clear loading message
        navTree.appendChild(to_ul(tree, "myUL"));

        const toggler = document.getElementsByClassName("caret");
        for (let i = 0; i < toggler.length; i++) {
            toggler[i].addEventListener("click", function () {
                this.parentElement.querySelector(".nested").classList.toggle("active");
                this.classList.toggle("caret-down");
            });
            // Initially expand all nodes
            toggler[i].parentElement.querySelector(".nested").classList.add("active");
            toggler[i].classList.add("caret-down");
        }
    }

    function unflatten(arr) {
        const tree = [];
        const mappedArr = {};
        let arrElem;
        let mappedElem;

        for (let i = 0, len = arr.length; i < len; i++) {
            arrElem = arr[i];
            mappedArr[arrElem.instanceID] = arrElem;
            mappedArr[arrElem.instanceID].children = [];
        }

        for (const id in mappedArr) {
            if (mappedArr.hasOwnProperty(id)) {
                mappedElem = mappedArr[id];
                if (mappedElem.parentID) {
                    mappedArr[mappedElem.parentID].children.push(mappedElem);
                } else {
                    tree.push(mappedElem);
                }
            }
        }
        return tree;
    }

    function to_ul(branches, setID = "", setClass = "") {
        const outerul = document.createElement("ul");
        const lengthOfName = 25;

        if (setID != "") {
            outerul.id = setID;
        }
        if (setClass != "") {
            outerul.className = setClass;
        }

        for (let i = 0, n = branches.length; i < n; i++) {
            const branch = branches[i];
            const li = document.createElement("li");

            let text = branch.name.replace(/_/g, " ");
            if (text.includes("GLTF")) {
                text = text.replace(text, "All");
            }
            else {
                text = "[" + text.substring(text.lastIndexOf(" ") + 1) + "] " + text.substring(0, text.lastIndexOf(" "))
            }

            const textNode = document.createTextNode(text);

            if (branch.isParent) {
                const sp = document.createElement("span");
                sp.className = "caret";

                sp.appendChild(textNode);

                li.appendChild(sp);
                li.appendChild(createButton("Show", branch.instanceID, branch.name));
            } else {
                const sp2 = document.createElement("span");
                sp2.className = "caret_child";
                sp2.appendChild(textNode);
                li.appendChild(sp2);
                li.appendChild(createButton("Show", branch.instanceID, branch.name));
            }

            if (branch.children) {
                li.appendChild(to_ul(branch.children, branch.instanceID, "nested"));
            }

            outerul.appendChild(li);
        }

        return outerul;
    }

    function createButton(btnType, instance, name) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = btnType;
        btn.id = instance + "_" + name + "_" + btnType;
        btn.style.backgroundColor = "blue";
        btn.value = instance;
        const btnText = document.createTextNode(btnType);
        btn.appendChild(btnText);

        return btn;
    }

    function toggleVisibility(api, button) {
        const isHidden = button.style.backgroundColor === "grey";

        if (isHidden) {
            api.show(button.value);
            button.style.backgroundColor = "blue";
            button.textContent = "Show";
        } else {
            api.hide(button.value);
            button.style.backgroundColor = "grey";
            button.textContent = "Hide";
        }

        const childButtons = document
            .getElementById(button.value)
            .getElementsByClassName("Show");

        for (let i = 0; i < childButtons.length; i++) {
            const childButton = childButtons[i];
            if (isHidden) {
                api.show(childButton.value);
                childButton.style.backgroundColor = "blue";
            } else {
                api.hide(childButton.value);
                childButton.style.backgroundColor = "grey";
            }
        }
    }

    function recurse(nodeTree, childCount, theParentID) {
        if (typeof nodeTree != "undefined") {
            for (let i = 0; i < childCount; i++) {
                const node = {
                    name: nodeTree.children[i].name,
                    type: nodeTree.children[i].type,
                    instanceID: nodeTree.children[i].instanceID,
                    isParent: false,
                    parentID: theParentID
                };

                if (node.type == "MatrixTransform") {
                    node.isParent = isParent(nodeTree.children[i].children);

                    officialNodes.push(node);

                    recurse(
                        nodeTree.children[i],
                        nodeTree.children[i].children.length,
                        nodeTree.children[i].instanceID
                    );
                }
            }
        }
    }

    function isParent(children) {
        let result = false;

        for (let i = 0; i < children.length; i++) {
            if (children[i].type == "MatrixTransform") {
                result = true;
                break;
            } else {
                result = false;
            }
        }

        return result;
    }
}

// Add event listener for when the script loads
document.addEventListener('DOMContentLoaded', function () {
    // Check if Sketchfab is loaded
    if (window.Sketchfab) {
        initSketchfab();
    } else {
        // If not loaded yet, wait for it
        document.querySelector('script[src*="sketchfab-viewer"]').addEventListener('load', initSketchfab);
    }
});