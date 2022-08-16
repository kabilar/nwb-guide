const settings = require("electron-settings");
const { existsSync } = require("original-fs");
const { default: Swal } = require("sweetalert2");
// this variable is here to keep track of when the Organize datasets/Continue button is enabled or disabled

document.body.addEventListener("click", (event) => {
  if (event.target.dataset.section) {
    handleSectionTrigger(event);
  } else if (event.target.dataset.modal) {
    handleModalTrigger(event);
  } else if (event.target.classList.contains("modal-hide")) {
    hideAllModals();
  }
});

document.body.addEventListener("custom-back", (e) => {
  handleSectionTrigger(e);
});

async function handleSectionTrigger(event) {
  function saveTempSodaProgress(progressFileName, sodaObject) {
    try {
      fs.mkdirSync(progressFilePath, { recursive: true });
    } catch (error) {
      log.error(error);
      console.log(error);
    }
    var filePath = path.join(progressFilePath, progressFileName + ".json");
    //update json obj progress

    // delete sodaObject["dataset-structure"] value that was added only for the Preview tree view
    if ("files" in sodaObject["dataset-structure"]) {
      sodaObject["dataset-structure"]["files"] = {};
    }
    //delete manifest files added for treeview
    // delete manifest files added for treeview
    for (var highLevelFol in sodaObject["dataset-structure"]["folders"]) {
      if (
        "manifest.xlsx" in
          sodaObject["dataset-structure"]["folders"][highLevelFol]["files"] &&
        sodaObject["dataset-structure"]["folders"][highLevelFol]["files"][
          "manifest.xlsx"
        ]["forTreeview"] === true
      ) {
        delete sodaObject["dataset-structure"]["folders"][highLevelFol][
          "files"
        ]["manifest.xlsx"];
      }
    }
    fs.writeFileSync(filePath, JSON.stringify(sodaObject));

    Swal.fire({
      icon: "success",
      text: "Successfully saved progress!",
      showConfirmButton: "OK",
      heightAuto: false,
      backdrop: "rgba(0,0,0, 0.4)",
      showClass: {
        popup: "animate__animated animate__fadeInDown animate__faster",
      },
      hideClass: {
        popup: "animate__animated animate__fadeOutUp animate__faster",
      },
    });
  }

  // Display the current section
  const sectionId = `${event.target.dataset.section}-section`;
  const itemsContainer = document.getElementById("items");

  console.log(sectionId);

  if (sectionId === "guided_mode-section") {
    //Transition file explorer elements to guided mode
    organizeDSglobalPath = document.getElementById("guided-input-global-path");
    organizeDSglobalPath.value = "";
    dataset_path = document.getElementById("guided-input-global-path");
    scroll_box = document.querySelector("#guided-body");
    itemsContainer.innerHTML = "";
    $(".shared-folder-structure-element").appendTo(
      $("#guided-folder-structure-container")
    );

    guidedPrepareHomeScreen();
  }

  if (sectionId === "main_tabs-section") {
    //Transition file explorer elements to guided mode
    organizeDSglobalPath = document.getElementById("input-global-path");
    organizeDSglobalPath.value = "My_dataset_folder/";
    dataset_path = document.getElementById("input-global-path");
    scroll_box = document.querySelector("#organize-dataset-tab");
    itemsContainer.innerHTML = "";
    $(".shared-folder-structure-element").appendTo(
      $("#free-form-folder-structure-container")
    );

    //Reset variables shared with guided-mode if they had been modified
    sodaJSONObj = {};
    datasetStructureJSONObj = {};
    subjectsTableData = [];
    samplesTableData = [];
  }

  hideAllSectionsAndDeselectButtons();

  if (event.detail.target) {
    let previous_section = `${event.detail.target.dataset.section}-section`;
    document.getElementById(previous_section).classList.add("is-shown");
    forceActionSidebar("show");
    return;
  }

  // Render guided mode resume progress cards if guided mode section is chosen
  // and move the folder structuring elements to guided mode

  document.getElementById(sectionId).classList.add("is-shown");

  let showSidebarSections = [
    "main_tabs-section",
    "getting_started-section",
    "guided_mode-section",
    "help-section",
    "documentation-section",
    "contact-us-section",
  ];

  if (showSidebarSections.includes(sectionId)) {
    forceActionSidebar("show");
  } else {
    forceActionSidebar("hide");
  }

  considerNextBtn();

  // Save currently active button in localStorage
  const buttonId = event.target.getAttribute("id");
  settings.set("activeSectionButtonId", buttonId);
}

function considerNextBtn() {
  if (nextBtnDisabledVariable !== undefined) {
    if (nextBtnDisabledVariable === true) {
      $("#nextBtn").prop("disabled", true);
    } else {
      $("#nextBtn").prop("disabled", false);
    }
  }
}

function showMainContent() {
  document.querySelector(".js-nav").classList.add("is-shown");
  document.querySelector(".js-content").classList.add("is-shown");
}

function handleModalTrigger(event) {
  hideAllModals();
  const modalId = `${event.target.dataset.modal}-modal`;
  document.getElementById(modalId).classList.add("is-shown");
}

function hideAllModals() {
  const modals = document.querySelectorAll(".modal.is-shown");
  Array.prototype.forEach.call(modals, (modal) => {
    modal.classList.remove("is-shown");
  });
  showMainContent();
}

function hideAllSectionsAndDeselectButtons() {
  const sections = document.querySelectorAll(".js-section.is-shown");
  Array.prototype.forEach.call(sections, (section) => {
    section.classList.remove("is-shown");
  });

  const buttons = document.querySelectorAll(".nav-button.is-selected");
  Array.prototype.forEach.call(buttons, (button) => {
    button.classList.remove("is-selected");
  });
}

//function displayAbout () {
//  document.querySelector('#curate-section').classList.add('is-shown')
//}

// Default to the view that was active the last time the app was open
const sectionId = settings.get("activeSectionButtonId");
if (sectionId) {
  showMainContent();
  // const section = document.getElementById(sectionId)
  // if (section) section.click()
} else {
  showMainContent();
  // activateDefaultSection()
  //displayAbout()
}

// Set of functions for the footer shortcuts between sections
// only required for when switching between section where the menu needs to change
// TO DISCUSS - add these for all return buttons and pulse the button on return maybe?
// Should help if people lose their position
$("#shortcut-navigate-to-organize").on("click", () => {
  $("#prepare_dataset_tab").click();
  $("#organize_dataset_btn").click();
});

$("#shortcut-navigate-to-create_submission").on("click", () => {
  $("#prepare_metadata_tab").click();
  $("#create_submission_btn").click();
});
