import {
    Route
} from "../framework/gc";


export const RequestDeadlockProfileRoute: Route = {
    requestId: 9026,
    request: {
        name: "RequestDeadlockProfile"
    },
    responseId: 9027,
    response: {
        name: "RequestDeadlockProfileResponse"
    }
};


export const RequestDeadlockProfile =
(
    ctx:any
):void => {

    log(
        "[9026] RequestDeadlockProfile"
    );

};


export const createRequestDeadlockProfileHandler =
() => RequestDeadlockProfile;

export default RequestDeadlockProfile;
