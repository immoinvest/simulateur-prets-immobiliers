export interface BienData {
  prixBienFAI: number;
  fraisAgence: number;
  montantTravaux: number;
  fraisNotaire: number;
  revenuMensuelNet: number;
}

export interface PretData {
  nomBanque: string;
  apport: number;
  fraisDossier: number;
  fraisGarantie: number;
  tauxNominal: number;
  tauxAssurance: number;
  dureePret: number;
  differeTotal: number;
  differePartiel: number;
}

export interface ResultatCalcul {
  montantEmprunt: number;
  mensualiteHorsAssurance: number;
  mensualiteAssurance: number;
  mensualiteTotale: number;
  montantInterets: number;
  montantAssurance: number;
  montantTotalInterets: number;
  taeg: number;
  taegAvecAssurance: number;
  fraisDossier: number;
  fraisGarantie: number;
  tauxNominal: number;
  tauxAssurance: number;
}

export interface LigneAmortissement {
  numero: number;
  date: string;
  soldeInitial: number;
  mensualite: number;
  versementSupplementaire: number;
  versementTotal: number;
  capitalRembourse: number;
  interets: number;
  interetsCumules: number;
  resteARembourser: number;
  annee: number;
  mensualiteAssurance: number;
  mensualiteTotale: number;
}

export interface EcheancierPeriode {
  periode: string;
  echeanceHorsAssurance: number;
  echeanceAvecAssurance: number;
}

export interface ComparaisonPrets {
  taegHorsAssurance: {
    pret1: number;
    pret2: number;
    difference: number;
  };
  taegAvecAssurance: {
    pret1: number;
    pret2: number;
    difference: number;
  };
  mensualiteTotale: {
    pret1: number;
    pret2: number;
    difference: number;
  };
  coutTotalCredit: {
    pret1: number;
    pret2: number;
    difference: number;
  };
  tauxEndettement: {
    pret1: number;
    pret2: number;
    difference: number;
  };
  dureePret: {
    pret1: number;
    pret2: number;
    difference: number;
  };
}
