import { BienData, PretData, ResultatCalcul, LigneAmortissement, EcheancierPeriode } from './types';

/**
 * Calcule le montant à emprunter en fonction des données du bien et du prêt
 * @param bienData Données du bien immobilier
 * @param pretData Données du prêt
 * @returns Montant à emprunter
 */
export function calculerMontantEmprunt(bienData: BienData, pretData: PretData): number {
    const montantTotal = bienData.prixBienFAI + bienData.montantTravaux + bienData.fraisNotaire;
    return montantTotal - pretData.apport;
}

/**
 * Calcule les mensualités et autres résultats du prêt
 * @param montantEmprunt Montant à emprunter
 * @param pretData Données du prêt
 * @returns Résultats du calcul
 */
export function calculerMensualites(montantEmprunt: number, pretData: PretData): ResultatCalcul {
    // Taux mensuel
    const tauxMensuel = pretData.tauxNominal / 12;
    const tauxAssuranceMensuel = pretData.tauxAssurance / 12;
    
    // Nombre de mensualités
    const nombreMensualites = pretData.dureePret * 12;
    
    // Calcul de la mensualité (hors assurance)
    const mensualiteHorsAssurance = (montantEmprunt * tauxMensuel) / (1 - Math.pow(1 + tauxMensuel, -nombreMensualites));
    
    // Calcul de la mensualité d'assurance
    const mensualiteAssurance = montantEmprunt * tauxAssuranceMensuel;
    
    // Calcul du montant total des intérêts
    const montantInterets = (mensualiteHorsAssurance * nombreMensualites) - montantEmprunt;
    
    // Calcul du montant total de l'assurance
    const montantAssurance = mensualiteAssurance * nombreMensualites;
    
    // Calcul du TAEG (hors assurance)
    // Approximation par itération
    let taeg = pretData.tauxNominal; // Première approximation
    const precision = 0.0000001;
    const maxIterations = 1000;
    let iteration = 0;
    
    while (iteration < maxIterations) {
        const taegMensuel = taeg / 12;
        const mensualiteCalculee = (montantEmprunt * taegMensuel) / (1 - Math.pow(1 + taegMensuel, -nombreMensualites));
        const montantInteretsCalcules = (mensualiteCalculee * nombreMensualites) - montantEmprunt;
        
        if (Math.abs(montantInteretsCalcules - montantInterets) < precision) {
            break;
        }
        
        if (montantInteretsCalcules > montantInterets) {
            taeg -= precision * 10;
        } else {
            taeg += precision * 10;
        }
        
        iteration++;
    }
    
    // Calcul du TAEG avec assurance
    // Approximation par itération
    let taegAvecAssurance = pretData.tauxNominal + pretData.tauxAssurance; // Première approximation
    iteration = 0;
    
    while (iteration < maxIterations) {
        const taegMensuel = taegAvecAssurance / 12;
        const mensualiteCalculee = (montantEmprunt * taegMensuel) / (1 - Math.pow(1 + taegMensuel, -nombreMensualites));
        const montantTotalCalcule = (mensualiteCalculee * nombreMensualites) - montantEmprunt;
        const montantTotalReel = montantInterets + montantAssurance;
        
        if (Math.abs(montantTotalCalcule - montantTotalReel) < precision) {
            break;
        }
        
        if (montantTotalCalcule > montantTotalReel) {
            taegAvecAssurance -= precision * 10;
        } else {
            taegAvecAssurance += precision * 10;
        }
        
        iteration++;
    }
    
    return {
        montantEmprunt,
        mensualiteHorsAssurance,
        mensualiteAssurance,
        mensualiteTotale: mensualiteHorsAssurance + mensualiteAssurance,
        montantInterets,
        montantAssurance,
        montantTotalInterets: montantInterets + montantAssurance + pretData.fraisDossier + pretData.fraisGarantie,
        taeg,
        taegAvecAssurance,
        fraisDossier: pretData.fraisDossier,
        fraisGarantie: pretData.fraisGarantie,
        tauxNominal: pretData.tauxNominal,
        tauxAssurance: pretData.tauxAssurance
    };
}

/**
 * Calcule le tableau d'amortissement du prêt
 * @param montantEmprunt Montant à emprunter
 * @param pretData Données du prêt
 * @returns Tableau d'amortissement
 */
export function calculerTableauAmortissement(montantEmprunt: number, pretData: PretData): LigneAmortissement[] {
    // Taux mensuel
    const tauxMensuel = pretData.tauxNominal / 12;
    const tauxAssuranceMensuel = pretData.tauxAssurance / 12;
    
    // Nombre de mensualités
    const nombreMensualites = pretData.dureePret * 12;
    
    // Calcul de la mensualité (hors assurance)
    const mensualiteHorsAssurance = (montantEmprunt * tauxMensuel) / (1 - Math.pow(1 + tauxMensuel, -nombreMensualites));
    
    // Calcul de la mensualité d'assurance
    const mensualiteAssurance = montantEmprunt * tauxAssuranceMensuel;
    
    // Tableau d'amortissement
    const tableau: LigneAmortissement[] = [];
    
    // Date de début (aujourd'hui + 1 mois)
    const dateDebut = new Date();
    dateDebut.setMonth(dateDebut.getMonth() + 1);
    
    let soldeRestant = montantEmprunt;
    
    for (let i = 1; i <= nombreMensualites; i++) {
        // Calcul de la date
        const date = new Date(dateDebut);
        date.setMonth(dateDebut.getMonth() + i - 1);
        
        // Calcul des intérêts
        const interets = soldeRestant * tauxMensuel;
        
        // Calcul du capital remboursé
        const capitalRembourse = mensualiteHorsAssurance - interets;
        
        // Mise à jour du solde restant
        const nouveauSolde = soldeRestant - capitalRembourse;
        
        // Ajout de la ligne au tableau
        tableau.push({
            numero: i,
            date: date.toISOString().split('T')[0],
            soldeInitial: soldeRestant,
            mensualite: mensualiteHorsAssurance,
            versementSupplementaire: 0,
            versementTotal: mensualiteHorsAssurance,
            capitalRembourse,
            interets,
            interetsCumules: tableau.length > 0 ? tableau[tableau.length - 1].interetsCumules + interets : interets,
            resteARembourser: nouveauSolde,
            annee: Math.ceil(i / 12),
            mensualiteAssurance,
            mensualiteTotale: mensualiteHorsAssurance + mensualiteAssurance
        });
        
        soldeRestant = nouveauSolde;
    }
    
    return tableau;
}

/**
 * Calcule le tableau d'amortissement avec différé total
 * @param montantEmprunt Montant à emprunter
 * @param pretData Données du prêt
 * @returns Tableau d'amortissement
 */
export function calculerTableauAmortissementAvecDiffereTotal(montantEmprunt: number, pretData: PretData): LigneAmortissement[] {
    // Taux mensuel
    const tauxMensuel = pretData.tauxNominal / 12;
    const tauxAssuranceMensuel = pretData.tauxAssurance / 12;
    
    // Nombre de mensualités
    const nombreMensualites = pretData.dureePret * 12;
    const nombreMensualitesDiffere = pretData.differeTotal;
    const nombreMensualitesNormales = nombreMensualites - nombreMensualitesDiffere;
    
    // Calcul de la mensualité (hors assurance) pour la période normale
    const mensualiteHorsAssurance = (montantEmprunt * (1 + tauxMensuel) ** nombreMensualitesDiffere * tauxMensuel) / (1 - Math.pow(1 + tauxMensuel, -nombreMensualitesNormales));
    
    // Calcul de la mensualité d'assurance
    const mensualiteAssurance = montantEmprunt * tauxAssuranceMensuel;
    
    // Tableau d'amortissement
    const tableau: LigneAmortissement[] = [];
    
    // Date de début (aujourd'hui + 1 mois)
    const dateDebut = new Date();
    dateDebut.setMonth(dateDebut.getMonth() + 1);
    
    let soldeRestant = montantEmprunt;
    
    // Période de différé total
    for (let i = 1; i <= nombreMensualitesDiffere; i++) {
        // Calcul de la date
        const date = new Date(dateDebut);
        date.setMonth(dateDebut.getMonth() + i - 1);
        
        // Calcul des intérêts (capitalisés)
        const interets = soldeRestant * tauxMensuel;
        
        // Mise à jour du solde restant (les intérêts sont capitalisés)
        const nouveauSolde = soldeRestant + interets;
        
        // Ajout de la ligne au tableau
        tableau.push({
            numero: i,
            date: date.toISOString().split('T')[0],
            soldeInitial: soldeRestant,
            mensualite: 0, // Pas de mensualité pendant le différé total
            versementSupplementaire: 0,
            versementTotal: 0,
            capitalRembourse: 0,
            interets,
            interetsCumules: tableau.length > 0 ? tableau[tableau.length - 1].interetsCumules + interets : interets,
            resteARembourser: nouveauSolde,
            annee: Math.ceil(i / 12),
            mensualiteAssurance,
            mensualiteTotale: mensualiteAssurance // Seulement l'assurance pendant le différé
        });
        
        soldeRestant = nouveauSolde;
    }
    
    // Période normale
    for (let i = nombreMensualitesDiffere + 1; i <= nombreMensualites; i++) {
        // Calcul de la date
        const date = new Date(dateDebut);
        date.setMonth(dateDebut.getMonth() + i - 1);
        
        // Calcul des intérêts
        const interets = soldeRestant * tauxMensuel;
        
        // Calcul du capital remboursé
        const capitalRembourse = mensualiteHorsAssurance - interets;
        
        // Mise à jour du solde restant
        const nouveauSolde = soldeRestant - capitalRembourse;
        
        // Ajout de la ligne au tableau
        tableau.push({
            numero: i,
            date: date.toISOString().split('T')[0],
            soldeInitial: soldeRestant,
            mensualite: mensualiteHorsAssurance,
            versementSupplementaire: 0,
            versementTotal: mensualiteHorsAssurance,
            capitalRembourse,
            interets,
            interetsCumules: tableau.length > 0 ? tableau[tableau.length - 1].interetsCumules + interets : interets,
            resteARembourser: nouveauSolde,
            annee: Math.ceil(i / 12),
            mensualiteAssurance,
            mensualiteTotale: mensualiteHorsAssurance + mensualiteAssurance
        });
        
        soldeRestant = nouveauSolde;
    }
    
    return tableau;
}

/**
 * Calcule le tableau d'amortissement avec différé partiel
 * @param montantEmprunt Montant à emprunter
 * @param pretData Données du prêt
 * @returns Tableau d'amortissement
 */
export function calculerTableauAmortissementAvecDifferePartiel(montantEmprunt: number, pretData: PretData): LigneAmortissement[] {
    // Taux mensuel
    const tauxMensuel = pretData.tauxNominal / 12;
    const tauxAssuranceMensuel = pretData.tauxAssurance / 12;
    
    // Nombre de mensualités
    const nombreMensualites = pretData.dureePret * 12;
    const nombreMensualitesDiffere = pretData.differePartiel;
    const nombreMensualitesNormales = nombreMensualites - nombreMensualitesDiffere;
    
    // Calcul de la mensualité (hors assurance) pour la période normale
    const mensualiteHorsAssurance = (montantEmprunt * tauxMensuel) / (1 - Math.pow(1 + tauxMensuel, -nombreMensualitesNormales));
    
    // Calcul de la mensualité d'assurance
    const mensualiteAssurance = montantEmprunt * tauxAssuranceMensuel;
    
    // Tableau d'amortissement
    const tableau: LigneAmortissement[] = [];
    
    // Date de début (aujourd'hui + 1 mois)
    const dateDebut = new Date();
    dateDebut.setMonth(dateDebut.getMonth() + 1);
    
    let soldeRestant = montantEmprunt;
    
    // Période de différé partiel
    for (let i = 1; i <= nombreMensualitesDiffere; i++) {
        // Calcul de la date
        const date = new Date(dateDebut);
        date.setMonth(dateDebut.getMonth() + i - 1);
        
        // Calcul des intérêts
        const interets = soldeRestant * tauxMensuel;
        
        // Ajout de la ligne au tableau
        tableau.push({
            numero: i,
            date: date.toISOString().split('T')[0],
            soldeInitial: soldeRestant,
            mensualite: interets, // Seulement les intérêts pendant le différé partiel
            versementSupplementaire: 0,
            versementTotal: interets,
            capitalRembourse: 0,
            interets,
            interetsCumules: tableau.length > 0 ? tableau[tableau.length - 1].interetsCumules + interets : interets,
            resteARembourser: soldeRestant,
            annee: Math.ceil(i / 12),
            mensualiteAssurance,
            mensualiteTotale: interets + mensualiteAssurance
        });
    }
    
    // Période normale
    for (let i = nombreMensualitesDiffere + 1; i <= nombreMensualites; i++) {
        // Calcul de la date
        const date = new Date(dateDebut);
        date.setMonth(dateDebut.getMonth() + i - 1);
        
        // Calcul des intérêts
        const interets = soldeRestant * tauxMensuel;
        
        // Calcul du capital remboursé
        const capitalRembourse = mensualiteHorsAssurance - interets;
        
        // Mise à jour du solde restant
        const nouveauSolde = soldeRestant - capitalRembourse;
        
        // Ajout de la ligne au tableau
        tableau.push({
            numero: i,
            date: date.toISOString().split('T')[0],
            soldeInitial: soldeRestant,
            mensualite: mensualiteHorsAssurance,
            versementSupplementaire: 0,
            versementTotal: mensualiteHorsAssurance,
            capitalRembourse,
            interets,
            interetsCumules: tableau.length > 0 ? tableau[tableau.length - 1].interetsCumules + interets : interets,
            resteARembourser: nouveauSolde,
            annee: Math.ceil(i / 12),
            mensualiteAssurance,
            mensualiteTotale: mensualiteHorsAssurance + mensualiteAssurance
        });
        
        soldeRestant = nouveauSolde;
    }
    
    return tableau;
}

/**
 * Calcule le tableau d'amortissement avec différé total suivi d'un différé partiel
 * @param montantEmprunt Montant à emprunter
 * @param pretData Données du prêt
 * @returns Tableau d'amortissement
 */
export function calculerTableauAmortissementAvecDiffereCombine(montantEmprunt: number, pretData: PretData): LigneAmortissement[] {
    // Taux mensuel
    const tauxMensuel = pretData.tauxNominal / 12;
    const tauxAssuranceMensuel = pretData.tauxAssurance / 12;
    
    // Nombre de mensualités
    const nombreMensualites = pretData.dureePret * 12;
    const nombreMensualitesDiffereTotal = pretData.differeTotal;
    const nombreMensualitesDifferePartiel = pretData.differePartiel;
    const nombreMensualitesNormales = nombreMensualites - nombreMensualitesDiffereTotal - nombreMensualitesDifferePartiel;
    
    // Calcul de la mensualité (hors assurance) pour la période normale
    // Prend en compte la capitalisation des intérêts pendant le différé total
    const montantApresCapitalisation = montantEmprunt * Math.pow(1 + tauxMensuel, nombreMensualitesDiffereTotal);
    const mensualiteHorsAssurance = (montantApresCapitalisation * tauxMensuel) / (1 - Math.pow(1 + tauxMensuel, -nombreMensualitesNormales));
    
    // Calcul de la mensualité d'assurance
    const mensualiteAssurance = montantEmprunt * tauxAssuranceMensuel;
    
    // Tableau d'amortissement
    const tableau: LigneAmortissement[] = [];
    
    // Date de début (aujourd'hui + 1 mois)
    const dateDebut = new Date();
    dateDebut.setMonth(dateDebut.getMonth() + 1);
    
    let soldeRestant = montantEmprunt;
    
    // 1. Période de différé total
    for (let i = 1; i <= nombreMensualitesDiffereTotal; i++) {
        // Calcul de la date
        const date = new Date(dateDebut);
        date.setMonth(dateDebut.getMonth() + i - 1);
        
        // Calcul des intérêts (capitalisés)
        const interets = soldeRestant * tauxMensuel;
        
        // Mise à jour du solde restant (les intérêts sont capitalisés)
        const nouveauSolde = soldeRestant + interets;
        
        // Ajout de la ligne au tableau
        tableau.push({
            numero: i,
            date: date.toISOString().split('T')[0],
            soldeInitial: soldeRestant,
            mensualite: 0, // Pas de mensualité pendant le différé total
            versementSupplementaire: 0,
            versementTotal: 0,
            capitalRembourse: 0,
            interets,
            interetsCumules: tableau.length > 0 ? tableau[tableau.length - 1].interetsCumules + interets : interets,
            resteARembourser: nouveauSolde,
            annee: Math.ceil(i / 12),
            mensualiteAssurance,
            mensualiteTotale: mensualiteAssurance // Seulement l'assurance pendant le différé
        });
        
        soldeRestant = nouveauSolde;
    }
    
    // 2. Période de différé partiel
    for (let i = nombreMensualitesDiffereTotal + 1; i <= nombreMensualitesDiffereTotal + nombreMensualitesDifferePartiel; i++) {
        // Calcul de la date
        const date = new Date(dateDebut);
        date.setMonth(dateDebut.getMonth() + i - 1);
        
        // Calcul des intérêts
        const interets = soldeRestant * tauxMensuel;
        
        // Ajout de la ligne au tableau
        tableau.push({
            numero: i,
            date: date.toISOString().split('T')[0],
            soldeInitial: soldeRestant,
            mensualite: interets, // Seulement les intérêts pendant le différé partiel
            versementSupplementaire: 0,
            versementTotal: interets,
            capitalRembourse: 0,
            interets,
            interetsCumules: tableau.length > 0 ? tableau[tableau.length - 1].interetsCumules + interets : interets,
            resteARembourser: soldeRestant,
            annee: Math.ceil(i / 12),
            mensualiteAssurance,
            mensualiteTotale: interets + mensualiteAssurance
        });
    }
    
    // 3. Période normale
    for (let i = nombreMensualitesDiffereTotal + nombreMensualitesDifferePartiel + 1; i <= nombreMensualites; i++) {
        // Calcul de la date
        const date = new Date(dateDebut);
        date.setMonth(dateDebut.getMonth() + i - 1);
        
        // Calcul des intérêts
        const interets = soldeRestant * tauxMensuel;
        
        // Calcul du capital remboursé
        const capitalRembourse = mensualiteHorsAssurance - interets;
        
        // Mise à jour du solde restant
        const nouveauSolde = soldeRestant - capitalRembourse;
        
        // Ajout de la ligne au tableau
        tableau.push({
            numero: i,
            date: date.toISOString().split('T')[0],
            soldeInitial: soldeRestant,
            mensualite: mensualiteHorsAssurance,
            versementSupplementaire: 0,
            versementTotal: mensualiteHorsAssurance,
            capitalRembourse,
            interets,
            interetsCumules: tableau.length > 0 ? tableau[tableau.length - 1].interetsCumules + interets : interets,
            resteARembourser: nouveauSolde,
            annee: Math.ceil(i / 12),
            mensualiteAssurance,
            mensualiteTotale: mensualiteHorsAssurance + mensualiteAssurance
        });
        
        soldeRestant = nouveauSolde;
    }
    
    return tableau;
}

/**
 * Génère un échéancier simplifié pour affichage dans les résultats
 * @param montantEmprunt Montant à emprunter
 * @param pretData Données du prêt
 * @returns Échéancier simplifié
 */
export function genererEcheancierSimple(montantEmprunt: number, pretData: PretData): EcheancierPeriode[] {
    let tableau: LigneAmortissement[];
    
    // Sélection de la méthode de calcul appropriée en fonction des différés
    if (pretData.differeTotal > 0 && pretData.differePartiel > 0) {
        tableau = calculerTableauAmortissementAvecDiffereCombine(montantEmprunt, pretData);
    } else if (pretData.differeTotal > 0) {
        tableau = calculerTableauAmortissementAvecDiffereTotal(montantEmprunt, pretData);
    } else if (pretData.differePartiel > 0) {
        tableau = calculerTableauAmortissementAvecDifferePartiel(montantEmprunt, pretData);
    } else {
        tableau = calculerTableauAmortissement(montantEmprunt, pretData);
    }
    
    const echeancier: EcheancierPeriode[] = [];
    
    // Cas avec différé total et partiel combinés
    if (pretData.differeTotal > 0 && pretData.differePartiel > 0) {
        // 1. Période de différé total
        let sommeHorsAssurance = 0;
        let sommeAvecAssurance = 0;
        
        for (let i = 0; i < pretData.differeTotal; i++) {
            sommeHorsAssurance += tableau[i].mensualite;
            sommeAvecAssurance += tableau[i].mensualiteTotale;
        }
        
        const moyenneHorsAssurance1 = sommeHorsAssurance / pretData.differeTotal;
        const moyenneAvecAssurance1 = sommeAvecAssurance / pretData.differeTotal;
        
        echeancier.push({
            periode: `1 à ${pretData.differeTotal} mois`,
            echeanceHorsAssurance: moyenneHorsAssurance1,
            echeanceAvecAssurance: moyenneAvecAssurance1
        });
        
        // 2. Période de différé partiel
        sommeHorsAssurance = 0;
        sommeAvecAssurance = 0;
        
        for (let i = pretData.differeTotal; i < pretData.differeTotal + pretData.differePartiel; i++) {
            sommeHorsAssurance += tableau[i].mensualite;
            sommeAvecAssurance += tableau[i].mensualiteTotale;
        }
        
        const moyenneHorsAssurance2 = sommeHorsAssurance / pretData.differePartiel;
        const moyenneAvecAssurance2 = sommeAvecAssurance / pretData.differePartiel;
        
        echeancier.push({
            periode: `${pretData.differeTotal + 1} à ${pretData.differeTotal + pretData.differePartiel} mois`,
            echeanceHorsAssurance: moyenneHorsAssurance2,
            echeanceAvecAssurance: moyenneAvecAssurance2
        });
        
        // 3. Période normale
        sommeHorsAssurance = 0;
        sommeAvecAssurance = 0;
        
        for (let i = pretData.differeTotal + pretData.differePartiel; i < tableau.length; i++) {
            sommeHorsAssurance += tableau[i].mensualite;
            sommeAvecAssurance += tableau[i].mensualiteTotale;
        }
        
        const moyenneHorsAssurance3 = sommeHorsAssurance / (tableau.length - pretData.differeTotal - pretData.differePartiel);
        const moyenneAvecAssurance3 = sommeAvecAssurance / (tableau.length - pretData.differeTotal - pretData.differePartiel);
        
        echeancier.push({
            periode: `${pretData.differeTotal + pretData.differePartiel + 1} à ${tableau.length} mois`,
            echeanceHorsAssurance: moyenneHorsAssurance3,
            echeanceAvecAssurance: moyenneAvecAssurance3
        });
    }
    // Cas avec un seul type de différé
    else if (pretData.differeTotal > 0 || pretData.differePartiel > 0) {
        const differe = pretData.differeTotal > 0 ? pretData.differeTotal : pretData.differePartiel;
        
        // Calculer la moyenne des mensualités pendant le différé
        let sommeHorsAssurance = 0;
        let sommeAvecAssurance = 0;
        
        for (let i = 0; i < differe; i++) {
            sommeHorsAssurance += tableau[i].mensualite;
            sommeAvecAssurance += tableau[i].mensualiteTotale;
        }
        
        const moyenneHorsAssurance = sommeHorsAssurance / differe;
        const moyenneAvecAssurance = sommeAvecAssurance / differe;
        
        echeancier.push({
            periode: `1 à ${differe} mois`,
            echeanceHorsAssurance: moyenneHorsAssurance,
            echeanceAvecAssurance: moyenneAvecAssurance
        });
        
        // Période normale
        sommeHorsAssurance = 0;
        sommeAvecAssurance = 0;
        
        for (let i = differe; i < tableau.length; i++) {
            sommeHorsAssurance += tableau[i].mensualite;
            sommeAvecAssurance += tableau[i].mensualiteTotale;
        }
        
        const moyenneHorsAssuranceNormale = sommeHorsAssurance / (tableau.length - differe);
        const moyenneAvecAssuranceNormale = sommeAvecAssurance / (tableau.length - differe);
        
        echeancier.push({
            periode: `${differe + 1} à ${tableau.length} mois`,
            echeanceHorsAssurance: moyenneHorsAssuranceNormale,
            echeanceAvecAssurance: moyenneAvecAssuranceNormale
        });
    }
    // Cas sans différé
    else {
        // Calculer la moyenne des mensualités pour toute la durée du prêt
        let sommeHorsAssurance = 0;
        let sommeAvecAssurance = 0;
        
        for (let i = 0; i < tableau.length; i++) {
            sommeHorsAssurance += tableau[i].mensualite;
            sommeAvecAssurance += tableau[i].mensualiteTotale;
        }
        
        const moyenneHorsAssurance = sommeHorsAssurance / tableau.length;
        const moyenneAvecAssurance = sommeAvecAssurance / tableau.length;
        
        echeancier.push({
            periode: `1 à ${tableau.length} mois`,
            echeanceHorsAssurance: moyenneHorsAssurance,
            echeanceAvecAssurance: moyenneAvecAssurance
        });
    }
    
    return echeancier;
}
