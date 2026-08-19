// Deadlock 1422450
// Process-local Party join-code registry.

const partyCodes: any[] =
    [];

let codeSequence: any =
    100000;

export function generateDeadlockPartyJoinCode(
    partyId: any
): any {
    for (
        let attempt = 0;
        attempt < 900000;
        attempt++
    ) {
        codeSequence =
            codeSequence +
            1;

        if (
            codeSequence >
            999999
        ) {
            codeSequence =
                100001;
        }

        let used =
            false;

        for (
            let i = 0;
            i < partyCodes.length;
            i++
        ) {
            if (
                partyCodes[i].code ==
                codeSequence
            ) {
                used =
                    true;

                break;
            }
        }

        if (!used) {
            registerDeadlockPartyJoinCode(
                partyId,
                codeSequence
            );

            log(
                "[PARTY-CODE] generated party_id=" +
                partyId +
                " code=" +
                codeSequence
            );

            return codeSequence;
        }
    }

    return 0;
}

export function registerDeadlockPartyJoinCode(
    partyId: any,
    code: any
): void {
    releaseDeadlockPartyJoinCode(
        partyId
    );

    partyCodes.push({
        party_id:
            partyId,

        code:
            code
    });
}

export function releaseDeadlockPartyJoinCode(
    partyId: any
): void {
    for (
        let i =
            partyCodes.length - 1;
        i >= 0;
        i--
    ) {
        if (
            partyCodes[i].party_id ==
            partyId
        ) {
            partyCodes.splice(
                i,
                1
            );
        }
    }
}

export function findDeadlockPartyIdByJoinCode(
    code: any
): any {
    for (
        let i = 0;
        i < partyCodes.length;
        i++
    ) {
        if (
            partyCodes[i].code ==
            code
        ) {
            return partyCodes[i].party_id;
        }
    }

    return 0;
}
