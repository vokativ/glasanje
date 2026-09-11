export interface ElectionAuthority {
  candidateId: string;
  electionId: string;
  email: string;
  sourceUrl: string;
  expiresAt: string;
  evidenceSha256: string;
}

export interface MissionElectionContact {
  missionEmail: string;
  electionAuthority: ElectionAuthority | null;
}

export interface ResolvedElectionContact {
  missionEmail: string;
  electionAuthority: ElectionAuthority | null;
}


export const resolveCurrentElectionContact = (
  station: MissionElectionContact,
  now: Date | number = Date.now(),
): ResolvedElectionContact => {
  const currentTime = now instanceof Date ? now.getTime() : now;
  const electionAuthority = station.electionAuthority;
  const expiresAt = electionAuthority ? Date.parse(electionAuthority.expiresAt) : Number.NaN;

  return {
    missionEmail: station.missionEmail,
    electionAuthority:
      electionAuthority && Number.isFinite(expiresAt) && currentTime < expiresAt
        ? electionAuthority
        : null,
  };
};
