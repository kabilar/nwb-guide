from typing import List, Dict, Optional, Union
from neuroconv.datainterfaces import SpikeGLXRecordingInterface, PhySortingInterface
from neuroconv import datainterfaces, NWBConverter

import json
from neuroconv.utils import NWBMetaDataEncoder, LocalPathExpander
from pynwb.file import NWBFile, Subject
from nwbinspector.nwbinspector import InspectorOutputJSONEncoder
from pynwb.testing.mock.file import mock_NWBFile  # also mock_Subject
from neuroconv.tools.data_transfers import automatic_dandi_upload
from nwbinspector.register_checks import InspectorMessage, Importance
from nwbinspector.nwbinspector import configure_checks, load_config

from datetime import datetime

from pathlib import Path
import os

# Get stub save path
project_base_path = Path(__file__).parent.parent.parent
path_config = Path(project_base_path, "paths.config.json")
f = path_config.open()
data = json.load(f)
stub_save_path = Path(Path.home(), *data["stubs"])
f.close()


def locate_data(info: dict) -> dict:
    """Locate data from the specifies directories using fstrings."""

    expander = LocalPathExpander()
    out = expander.expand_paths(info)

    # Organize results by subject, session, and data type
    organized_output = {}
    for item in out:
        subject_id = item["metadata"]["Subject"]["subject_id"]
        session_id = item["metadata"]["NWBFile"]["session_id"]
        if subject_id not in organized_output:
            organized_output[subject_id] = {}

        if session_id not in organized_output[subject_id]:
            organized_output[subject_id][session_id] = {}

        organized_output[subject_id][session_id] = item

    return organized_output


def get_all_interface_info() -> dict:
    """Format an information structure to be used for selecting interfaces based on modality and technique."""

    # Hard coded for now - eventual goal will be to import this from NeuroConv
    hardcoded_interfaces = dict(SpikeGLX=SpikeGLXRecordingInterface, Phy=PhySortingInterface)

    return {
        interface.__name__: {
            "keywords": interface.keywords,
            # Once we use the raw neuroconv list, we will want to ensure that the interfaces themselves have a label property
            "label": format_name
            # Can also add a description here if we want to provide more information about the interface
        }
        for format_name, interface in hardcoded_interfaces.items()
    }


# Combine Multiple Interfaces
def get_custom_converter(interface_class_dict: dict) -> NWBConverter:
    class CustomNWBConverter(NWBConverter):
        data_interface_classes = {
            custom_name: getattr(datainterfaces, interface_name)
            for custom_name, interface_name in interface_class_dict.items()
        }

    return CustomNWBConverter


def instantiate_custom_converter(source_data, interface_class_dict) -> NWBConverter:
    CustomNWBConverter = get_custom_converter(interface_class_dict)
    return CustomNWBConverter(source_data)


def get_source_schema(interface_class_dict: dict) -> dict:
    """
    Function used to get schema from a CustomNWBConverter that can handle multiple interfaces
    """
    CustomNWBConverter = get_custom_converter(interface_class_dict)
    return CustomNWBConverter.get_source_schema()


def get_metadata_schema(source_data: Dict[str, dict], interfaces: dict) -> Dict[str, dict]:
    """
    Function used to fetch the metadata schema from a CustomNWBConverter instantiated from the source_data.
    """

    converter = instantiate_custom_converter(source_data, interfaces)
    schema = converter.get_metadata_schema()
    metadata = converter.get_metadata()
    return json.loads(json.dumps(dict(results=metadata, schema=schema), cls=NWBMetaDataEncoder))


def get_check_function(check_function_name: str) -> callable:
    """
    Function used to fetch an arbitrary NWB Inspector function
    """
    dandi_check_list = configure_checks(config=load_config(filepath_or_keyword="dandi"))
    dandi_check_registry = {check.__name__: check for check in dandi_check_list}

    check_function: callable = dandi_check_registry.get(check_function_name)
    if check_function is None:
        raise ValueError(f"Function {check_function_name} not found in nwbinspector")

    return check_function


def run_check_function(check_function: callable, arg: dict) -> dict:
    """
    Function used to run an arbitrary NWB Inspector function
    """

    output = check_function(arg)
    if isinstance(output, InspectorMessage):
        if output.importance != Importance.ERROR:
            output.importance = check_function.importance
    elif output is not None:
        for x in output:
            x.importance = check_function.importance

    return output


def validate_subject_metadata(
    subject_metadata: dict, check_function_name: str
) -> Union[None, InspectorMessage, List[InspectorMessage]]:
    """
    Function used to validate subject metadata
    """

    check_function = get_check_function(check_function_name)

    if isinstance(subject_metadata.get("date_of_birth"), str):
        subject_metadata["date_of_birth"] = datetime.fromisoformat(subject_metadata["date_of_birth"])

    return run_check_function(check_function, Subject(**subject_metadata))


def validate_nwbfile_metadata(
    nwbfile_metadata: dict, check_function_name: str
) -> Union[None, InspectorMessage, List[InspectorMessage]]:
    """
    Function used to validate NWBFile metadata
    """

    check_function = get_check_function(check_function_name)

    if isinstance(nwbfile_metadata.get("session_start_time"), str):
        nwbfile_metadata["session_start_time"] = datetime.fromisoformat(nwbfile_metadata["session_start_time"])

    return run_check_function(check_function, mock_NWBFile(**nwbfile_metadata))


def validate_metadata(metadata: dict, check_function_name: str) -> dict:
    """
    Function used to validate data using an arbitrary NWB Inspector function
    """

    check_function = get_check_function(check_function_name)

    if issubclass(check_function.neurodata_type, Subject):
        result = validate_subject_metadata(metadata, check_function_name)
    elif issubclass(check_function.neurodata_type, NWBFile):
        result = validate_nwbfile_metadata(metadata, check_function_name)
    else:
        raise ValueError(
            f"Function {check_function_name} with neurodata_type {check_function.neurodata_type} is not supported by this function"
        )

    return json.loads(json.dumps(result, cls=InspectorOutputJSONEncoder))


def convert_to_nwb(info: dict) -> str:
    """
    Function used to convert the source data to NWB format using the specified metadata.
    """

    nwbfile_path = Path(info["nwbfile_path"])
    parent_folder = nwbfile_path.parent

    folder = Path(info["folder"]) if "folder" in info else parent_folder

    run_stub_test = info.get("stub_test")

    parent_folder.mkdir(exist_ok=True, parents=True)  # Ensure all parent directories exist

    # add a subdirectory to a filepath if stub_test is true
    if run_stub_test:
        stub_save_path.mkdir(exist_ok=True)
        preview_path = stub_save_path / nwbfile_path.name

    converter = instantiate_custom_converter(info["source_data"], info["interfaces"])

    # Assume all interfaces have the same conversion options for now
    available_options = converter.get_conversion_options_schema()
    options = (
        {
            interface: {"stub_test": info["stub_test"]}
            if available_options.get("properties").get(interface).get("properties").get("stub_test")
            else {}
            for interface in info["source_data"]
        }
        if run_stub_test
        else None
    )

    file = converter.run_conversion(
        metadata=info["metadata"],
        nwbfile_path=preview_path if run_stub_test else nwbfile_path,
        overwrite=info.get("overwrite", False),
        conversion_options=options,
    )

    return str(file)


def upload_to_dandi(
    dandiset_id: str,
    nwb_folder_path: str,
    api_key: str,
    staging: Optional[bool] = None,  # Override default staging=True
    cleanup: Optional[bool] = None,
):
    os.environ["DANDI_API_KEY"] = api_key  # Update API Key

    return automatic_dandi_upload(
        dandiset_id=dandiset_id,
        nwb_folder_path=Path(nwb_folder_path),
        staging=staging,
        cleanup=cleanup,
    )
