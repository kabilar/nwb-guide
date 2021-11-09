/////// Load SPARC airtable data
var pennsieveHostname = "https://api.pennsieve.io";

// function to generate changes or readme
function generateRCFilesHelper(type) {
  var textValue = $(`#textarea-create-${type}`).val().trim();
  if (textValue === "") {
    Swal.fire({
      title: "Incomplete information",
      text: "Plase fill in the textarea.",
      heightAuto: false,
      backdrop: "rgba(0,0,0, 0.4)",
      icon: "error",
      showCancelButton: false,
      showClass: {
        popup: "animate__animated animate__zoomIn animate__faster",
      },
      hideClass: {
        popup: "animate__animated animate__zoomOut animate__faster",
      },
    });
    return "empty";
  }
}

function generateRCFiles(uploadBoolean, fileType) {
  var upperCaseLetters = fileType.toUpperCase() + ".txt";
  Swal.fire({
    title: `Generating the ${upperCaseLetters} file`,
    html: "Please wait...",
    allowEscapeKey: false,
    allowOutsideClick: false,
    heightAuto: false,
    backdrop: "rgba(0,0,0, 0.4)",
    timerProgressBar: false,
    didOpen: () => {
      Swal.showLoading();
    },
  }).then((result) => {});
  var textValue = $(`#textarea-create-${fileType}`).val().trim();
  if (uploadBoolean) {
    client.invoke(
      "api_upload_RC_file",
      textValue,
      upperCaseLetters,
      defaultBfAccount,
      $(`#bf_dataset_load_${fileType}`).text().trim(),
      (error, res) => {
        if (error) {
          var emessage = userError(error);
          log.error(error);
          console.error(error);
          Swal.fire({
            title: `Failed to generate the ${upperCaseLetters} file`,
            text: emessage,
            icon: "warning",
            heightAuto: false,
            backdrop: "rgba(0,0,0, 0.4)",
          });
          ipcRenderer.send(
            "track-event",
            "Error",
            `Prepare Metadata - Create ${upperCaseLetters}`,
            defaultBfDataset
          );
        } else {
          Swal.fire({
            title: `The ${upperCaseLetters} file has been successfully generated at the specified location.`,
            icon: "success",
            heightAuto: false,
            backdrop: "rgba(0,0,0, 0.4)",
          });
          ipcRenderer.send(
            "track-event",
            "Success",
            `Prepare Metadata - Create ${upperCaseLetters}`,
            defaultBfDataset
          );
        }
      }
    );
  } else {
    ipcRenderer.send(`open-destination-generate-${fileType}-locally`);
  }
}

var changesDestinationPath = "";
var readmeDestinationPath = "";

$(document).ready(function () {
  ipcRenderer.on(
    "selected-destination-generate-changes-locally",
    (event, dirpath, filename) => {
      filename = "CHANGES.txt";
      if (dirpath.length > 0) {
        var destinationPath = path.join(dirpath[0], filename);

        if (fs.existsSync(destinationPath)) {
          var emessage =
            "File '" +
            filename +
            "' already exists in " +
            dirpath[0] +
            ". Do you want to replace it?";
          Swal.fire({
            icon: "warning",
            title: "Metadata file already exists",
            text: `${emessage}`,
            heightAuto: false,
            backdrop: "rgba(0,0,0, 0.4)",
            showConfirmButton: true,
            showCancelButton: true,
            cancelButtonText: "No",
            confirmButtonText: "Yes",
          }).then((result) => {
            if (result.isConfirmed) {
              changesDestinationPath = destinationPath;
              $("#div-confirm-destination-changes-locally").css(
                "display",
                "flex"
              );
              document.getElementById(
                "input-destination-generate-changes-locally"
              ).placeholder = dirpath[0];
              // saveRCFile(data, "changes", destinationPath);
            } else {
              $("#div-confirm-destination-changes-locally").css(
                "display",
                "none"
              );
              changesDestinationPath = "";
              document.getElementById(
                "input-destination-generate-changes-locally"
              ).placeholder = "Browse here";
            }
          });
        } else {
          document.getElementById(
            "input-destination-generate-changes-locally"
          ).placeholder = dirpath[0];
          $("#div-confirm-destination-changes-locally").css("display", "flex");
          changesDestinationPath = destinationPath;
        }
      }
    }
  );
  ipcRenderer.on(
    "selected-destination-generate-readme-locally",
    (event, dirpath, filename) => {
      filename = "README.txt";
      let data = $("#textarea-create-readme").val().trim();
      if (dirpath.length > 0) {
        var destinationPath = path.join(dirpath[0], filename);
        if (fs.existsSync(destinationPath)) {
          var emessage =
            "File '" +
            filename +
            "' already exists in " +
            dirpath[0] +
            ". Do you want to replace it?";
          Swal.fire({
            icon: "warning",
            title: "Metadata file already exists",
            text: `${emessage}`,
            heightAuto: false,
            backdrop: "rgba(0,0,0, 0.4)",
            showConfirmButton: true,
            showCancelButton: true,
            cancelButtonText: "No",
            confirmButtonText: "Yes",
          }).then((result) => {
            if (result.isConfirmed) {
              readmeDestinationPath = destinationPath;
              $("#div-confirm-destination-readme-locally").css(
                "display",
                "flex"
              );
              document.getElementById(
                "input-destination-generate-readme-locally"
              ).placeholder = dirpath[0];
            } else {
              $("#div-confirm-destination-readme-locally").css(
                "display",
                "none"
              );
              readmeDestinationPath = "";
              document.getElementById(
                "input-destination-generate-readme-locally"
              ).placeholder = "Browse here";
            }
          });
        } else {
          $("#div-confirm-destination-readme-locally").css("display", "flex");
          readmeDestinationPath = destinationPath;
          document.getElementById(
            "input-destination-generate-readme-locally"
          ).placeholder = dirpath[0];
        }
      }
    }
  );

  ipcRenderer.on("selected-existing-changes", (event, filepath) => {
    if (filepath.length > 0) {
      if (filepath !== null) {
        document.getElementById(
          "existing-changes-file-destination"
        ).placeholder = filepath[0];
        ipcRenderer.send(
          "track-event",
          "Success",
          "Prepare Metadata - Continue with existing CHANGES.txt",
          defaultBfAccount
        );
        if (
          document.getElementById("existing-changes-file-destination")
            .placeholder !== "Browse here"
        ) {
          $("#div-confirm-existing-changes-import").show();
          $($("#div-confirm-existing-changes-import button")[0]).show();
        } else {
          $("#div-confirm-existing-changes-import").hide();
          $($("#div-confirm-existing-changes-import button")[0]).hide();
        }
      } else {
        document.getElementById(
          "existing-changes-file-destination"
        ).placeholder = "Browse here";
        $("#div-confirm-existing-changes-import").hide();
      }
    } else {
      document.getElementById("existing-changes-file-destination").placeholder =
        "Browse here";
      $("#div-confirm-existing-changes-import").hide();
    }
  });

  ipcRenderer.on("selected-existing-readme", (event, filepath) => {
    if (filepath.length > 0) {
      if (filepath !== null) {
        document.getElementById(
          "existing-readme-file-destination"
        ).placeholder = filepath[0];
        ipcRenderer.send(
          "track-event",
          "Success",
          "Prepare Metadata - Continue with existing README.txt",
          defaultBfAccount
        );
        if (
          document.getElementById("existing-readme-file-destination")
            .placeholder !== "Browse here"
        ) {
          $("#div-confirm-existing-readme-import").show();
          $($("#div-confirm-existing-readme-import button")[0]).show();
        } else {
          $("#div-confirm-existing-readme-import").hide();
          $($("#div-confirm-existing-readme-import button")[0]).hide();
        }
      } else {
        document.getElementById(
          "existing-readme-file-destination"
        ).placeholder = "Browse here";
        $("#div-confirm-existing-readme-import").hide();
      }
    } else {
      document.getElementById("existing-readme-file-destination").placeholder =
        "Browse here";
      $("#div-confirm-existing-readme-import").hide();
    }
  });

  $("#bf_dataset_load_changes").on("DOMSubtreeModified", function () {
    if ($("#Question-prepare-changes-2").hasClass("show")) {
      if (!$("#Question-prepare-changes-6").hasClass("show")) {
        $("#Question-prepare-changes-2").removeClass("show");
        $("#textarea-create-changes").val("");
      }
    }
    if ($("#bf_dataset_load_changes").text().trim() !== "None") {
      $("#div-check-bf-import-changes").css("display", "flex");
      $($("#div-check-bf-import-changes").children()[0]).show();
    } else {
      $("#div-check-bf-import-changes").css("display", "none");
    }
  });

  $("#bf_dataset_load_readme").on("DOMSubtreeModified", function () {
    if ($("#Question-prepare-readme-2").hasClass("show")) {
      if (!$("#Question-prepare-readme-6").hasClass("show")) {
        $("#Question-prepare-readme-2").removeClass("show");
        $("#textarea-create-readme").val("");
      }
    }
    if ($("#bf_dataset_load_readme").text().trim() !== "None") {
      $("#div-check-bf-import-readme").css("display", "flex");
      $($("#div-check-bf-import-readme").children()[0]).show();
    } else {
      $("#div-check-bf-import-readme").css("display", "none");
    }
  });

  $("#bf_dataset_generate_readme").on("DOMSubtreeModified", function () {
    if ($("#bf_dataset_generate_readme").text().trim() !== "None") {
      $("#div-check-bf-generate-readme").css("display", "flex");
    } else {
      $("#div-check-bf-generate-readme").css("display", "none");
    }
  });

  $("#bf_dataset_generate_changes").on("DOMSubtreeModified", function () {
    if ($("#bf_dataset_generate_changes").text().trim() !== "None") {
      $("#div-check-bf-generate-changes").css("display", "flex");
    } else {
      $("#div-check-bf-generate-changes").css("display", "none");
    }
  });
});

// write Readme or Changes files
function saveRCFile(type) {
  let data = $(`#textarea-create-${type}`).val().trim();
  let destinationPath;
  if (type === "changes") {
    destinationPath = changesDestinationPath;
  } else {
    destinationPath = readmeDestinationPath;
  }
  fs.writeFile(destinationPath, data, (err) => {
    if (err) {
      console.log(err);
      log.error(err);
      var emessage = userError(error);
      Swal.fire({
        title: `Failed to generate the existing ${type}.txt file`,
        html: emessage,
        heightAuto: false,
        backdrop: "rgba(0,0,0, 0.4)",
        icon: "error",
        didOpen: () => {
          Swal.hideLoading();
        },
      });
    } else {
      if (type === "changes") {
        var newName = path.join(path.dirname(destinationPath), "CHANGES.txt");
      } else {
        var newName = path.join(path.dirname(destinationPath), "README.txt");
      }
      fs.rename(destinationPath, newName, (err) => {
        if (err) {
          console.log(err);
          log.error(err);
          Swal.fire({
            title: `Failed to generate the ${type}.txt file`,
            heightAuto: false,
            backdrop: "rgba(0,0,0, 0.4)",
            icon: "error",
            didOpen: () => {
              Swal.hideLoading();
            },
          });
        } else {
          Swal.fire({
            title: `The ${type.toUpperCase()}.txt file has been successfully generated at the specified location.`,
            icon: "success",
            showConfirmButton: true,
            heightAuto: false,
            backdrop: "rgba(0,0,0, 0.4)",
            didOpen: () => {
              Swal.hideLoading();
            },
          });
        }
      });
    }
  });
}

// import existing Changes/README file
function showExistingRCFile(type) {
  if (
    $(`#existing-${type}-file-destination`).prop("placeholder") !==
      "Browse here" &&
    $(`#Question-prepare-${type}-2`).hasClass("show")
  ) {
    Swal.fire({
      title: `Are you sure you want to import a different ${type} file?`,
      text: "This will delete all of your previous work on this file.",
      showCancelButton: true,
      heightAuto: false,
      backdrop: "rgba(0,0,0, 0.4)",
      cancelButtonText: `No!`,
      cancelButtonColor: "#f44336",
      confirmButtonColor: "#3085d6",
      confirmButtonText: "Yes",
      icon: "warning",
      reverseButtons: reverseSwalButtons,
    }).then((boolean) => {
      if (boolean.isConfirmed) {
        ipcRenderer.send(`open-file-dialog-existing-${type}`);
        document.getElementById(
          `existing-${type}-file-destination`
        ).placeholder = "Browse here";
        $(`#div-confirm-existing-${type}-import`).hide();
        $($(`#div-confirm-existing-${type}-import button`)[0]).hide();
        $(`#Question-prepare-${type}-2`).removeClass("show");
      }
    });
  } else {
    ipcRenderer.send(`open-file-dialog-existing-${type}`);
  }
}

// function to load existing README/CHANGES files
function loadExistingRCFile(filepath, type) {
  // read file
  fs.readFile(filepath, "utf8", function (err, data) {
    if (err) {
      var emessage = userError(error);
      console.log(err);
      log.error(err);
      Swal.fire({
        title: "Failed to import existing file",
        html: emessage,
        heightAuto: false,
        backdrop: "rgba(0,0,0, 0.4)",
        icon: "error",
      });
    } else {
      // populate textarea
      $(`#textarea-create-${type}`).val(data);

      Swal.fire({
        title: "Loaded successfully!",
        icon: "success",
        showConfirmButton: true,
        heightAuto: false,
        backdrop: "rgba(0,0,0, 0.4)",
        didOpen: () => {
          Swal.hideLoading();
        },
      });
      $(`#div-confirm-existing-${type}-import`).hide();
      $($(`#div-confirm-existing-${type}-import button`)[0]).hide();
      $(`#button-fake-confirm-existing-${type}-file-load`).click();
    }
  });
}

function resetRCFile(type) {
  Swal.fire({
    backdrop: "rgba(0,0,0, 0.4)",
    confirmButtonText: "I want to start over!",
    focusCancel: true,
    heightAuto: false,
    icon: "warning",
    reverseButtons: reverseSwalButtons,
    showCancelButton: true,
    text: "Are you sure you want to start over and reset your progress?",
    showClass: {
      popup: "animate__animated animate__zoomIn animate__faster",
    },
    hideClass: {
      popup: "animate__animated animate__zoomOut animate__faster",
    },
  }).then((result) => {
    if (result.isConfirmed) {
      // 1. remove Prev and Show from all individual-question except for the first one
      // 2. empty all input, textarea, select, para-elements
      $(`#Question-prepare-${type}-1`).removeClass("prev");
      $(`#Question-prepare-${type}-1`).nextAll().removeClass("show");
      $(`#Question-prepare-${type}-1`).nextAll().removeClass("prev");
      $(`#Question-prepare-${type}-1`)
        .removeClass("checked")
        .removeClass("disabled")
        .removeClass("non-selected");
      $(`#Question-prepare-${type}-1 .option-card`)
        .removeClass("checked")
        .removeClass("disabled")
        .removeClass("non-selected");
      $(`#Question-prepare-${type}-1 .option-card .folder-input-check`).prop(
        "checked",
        false
      );
      $(`#existing-${type}-file-destination`).attr(
        "placeholder",
        "Browse here"
      );
      $(`#textarea-create-${type}`).val("");
    }
  });
}

async function getDatasetID(datasetName, jwt) {
  // fetch the tags for their dataset using the Pennsieve API
  let dataset;
  dataset = await get_dataset_by_name_id(datasetName, jwt);
  // grab the dataset's id
  const id = dataset["content"]["id"];

  return id;
}

const getReadme = async () => {
  // loading popup
  Swal.fire({
    title: "Loading an existing README.txt file",
    html: "Please wait...",
    // timer: 5000,
    allowEscapeKey: false,
    allowOutsideClick: false,
    heightAuto: false,
    backdrop: "rgba(0,0,0, 0.4)",
    timerProgressBar: false,
    didOpen: () => {
      Swal.showLoading();
    },
  }).then((result) => {});

  let datasetName = $(`#bf_dataset_load_readme`).text().trim();

  // authenticate the user
  let jwt;
  jwt = await get_access_token();

  let datasetID = await getDatasetID(datasetName, jwt);

  // obtain readme description
  let readmeDescription;
  let options = {
    method: "GET",
    headers: {
      Accept: "*/*",
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
  };

  readmeDescription = await fetch(
    `https://api.pennsieve.io/datasets/${datasetID}/readme`,
    options
  )
    .then((res) => res.json())
    .then((json) => json)
    .catch((err) => {
      var errorMessage =
        "Failed to load README file from selected dataset: " + err;
      console.error(errorMessage);
      Swal.fire({
        icon: "error",
        html: errorMessage,
        heightAuto: false,
        backdrop: "rgba(0,0,0,0.4)",
      });
    });

  if (readmeDescription.readme.trim() !== "") {
    $("#textarea-create-readme").val(readmeDescription.readme.trim());
    Swal.fire({
      title: "Loaded successfully!",
      icon: "success",
      showConfirmButton: true,
      heightAuto: false,
      backdrop: "rgba(0,0,0, 0.4)",
      didOpen: () => {
        Swal.hideLoading();
      },
    });
  } else {
    Swal.fire({
      icon: "warning",
      text: "The current README file is empty. Please edit it in the following textarea.",
      heightAuto: false,
      backdrop: "rgba(0,0,0,0.4)",
    });
  }
  $(
    $("#button-fake-confirm-existing-bf-readme-file-load").siblings()[0]
  ).hide();
  $("#button-fake-confirm-existing-bf-readme-file-load").click();
};

const getChanges = async () => {
  // loading popup
  Swal.fire({
    title: "Loading an existing CHANGES.txt file",
    html: "Please wait...",
    allowEscapeKey: false,
    allowOutsideClick: false,
    heightAuto: false,
    backdrop: "rgba(0,0,0, 0.4)",
    timerProgressBar: false,
    didOpen: () => {
      Swal.showLoading();
    },
  }).then((result) => {});

  let datasetName = $(`#bf_dataset_load_changes`).text().trim();
  client.invoke(
    "api_import_bf_changes",
    defaultBfAccount,
    datasetName,
    (error, res) => {
      if (error) {
        var emessage = userError(error);
        log.error(error);
        console.error(error);
        Swal.fire({
          title: "Failed to load existing CHANGES.txt file",
          text: emessage,
          icon: "warning",
          heightAuto: false,
          backdrop: "rgba(0,0,0, 0.4)",
        });
      } else {
        if (res.trim() !== "") {
          $("#textarea-create-changes").val(res.trim());
          Swal.fire({
            title: "Loaded successfully!",
            icon: "success",
            showConfirmButton: true,
            heightAuto: false,
            backdrop: "rgba(0,0,0, 0.4)",
            didOpen: () => {
              Swal.hideLoading();
            },
          });
        } else {
          Swal.fire({
            icon: "warning",
            text: "The current CHANGES file is empty. Please edit it in the following textarea.",
            heightAuto: false,
            backdrop: "rgba(0,0,0,0.4)",
          });
        }
        $(
          $("#button-fake-confirm-existing-bf-changes-file-load").siblings()[0]
        ).hide();
        $("#button-fake-confirm-existing-bf-changes-file-load").click();
      }
    }
  );
};

function importExistingRCFile(type) {
  var filePath = $(`#existing-${type}-file-destination`).prop("placeholder");
  if (type === "changes") {
    var upperCaseLetter = "CHANGES";
  } else {
    var upperCaseLetter = "README";
  }
  if (filePath === "Browse here") {
    Swal.fire(
      "No file chosen",
      `Please select a path to your ${upperCaseLetter}.txt file`,
      "error"
    );
  } else {
    if (path.parse(filePath).base !== `${upperCaseLetter}.txt`) {
      Swal.fire({
        title: "Incorrect file name",
        text: `Your file must be named '${upperCaseLetter}.txt' to be imported to SODA.`,
        heightAuto: false,
        backdrop: "rgba(0,0,0, 0.4)",
        icon: "error",
      });
    } else {
      Swal.fire({
        title: `Loading an existing '${upperCaseLetter}.txt' file`,
        html: "Please wait...",
        allowEscapeKey: false,
        allowOutsideClick: false,
        heightAuto: false,
        backdrop: "rgba(0,0,0, 0.4)",
        timerProgressBar: false,
        didOpen: () => {
          Swal.showLoading();
        },
      }).then((result) => {});
      setTimeout(loadExistingRCFile(filePath, type), 1000);
    }
  }
}
