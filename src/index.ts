import './styles.css';
import { BienData, PretData, ResultatCalcul, LigneAmortissement, EcheancierPeriode, ComparaisonPrets } from './types';
import { 
    calculerMontantEmprunt, 
    calculerMensualites, 
    calculerTableauAmortissement,
    calculerTableauAmortissementAvecDiffereTotal,
    calculerTableauAmortissementAvecDifferePartiel,
    genererEcheancierSimple
} from './calculPret';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Déclaration pour étendre jsPDF avec autoTable
declare module 'jspdf' {
    interface jsPDF {
        autoTable: (options: any) => {
            previous: {
                finalY: number;
            };
        };
    }
}

// Fonction pour calculer le tableau d'amortissement avec différé total puis partiel
function calculerTableauAmortissementAvecDiffereCombine(montantEmprunt: number, pretData: PretData): LigneAmortissement[] {
    const { tauxNominal, tauxAssurance, dureePret, differeTotal, differePartiel } = pretData;
    
    // Conversion des années en mois
    const dureeEnMois = dureePret * 12;
    
    // Calcul du taux mensuel
    const tauxMensuel = tauxNominal / 12;
    const tauxAssuranceMensuel = tauxAssurance / 12;
    
    // Calcul de la mensualité (hors assurance et hors période de différé)
    const mensualiteHorsAssurance = (montantEmprunt * tauxMensuel * Math.pow(1 + tauxMensuel, dureeEnMois - differeTotal - differePartiel)) / (Math.pow(1 + tauxMensuel, dureeEnMois - differeTotal - differePartiel) - 1);
    const mensualiteAssurance = montantEmprunt * tauxAssuranceMensuel;
    
    // Initialisation du tableau d'amortissement
    const tableau: LigneAmortissement[] = [];
    
    // Date actuelle pour le calcul des dates d'échéance
    const dateActuelle = new Date();
    let soldeRestant = montantEmprunt;
    let interetsCumules = 0;
    
    // Période de différé total (remboursement de l'assurance uniquement)
    for (let i = 1; i <= differeTotal; i++) {
        const dateEcheance = new Date(dateActuelle);
        dateEcheance.setMonth(dateActuelle.getMonth() + i);
        const annee = Math.ceil(i / 12);
        
        tableau.push({
            numero: i,
            date: `${dateEcheance.getMonth() + 1}/${dateEcheance.getFullYear()}`,
            soldeInitial: soldeRestant,
            mensualite: 0,
            capitalRembourse: 0,
            interets: 0,
            mensualiteAssurance: mensualiteAssurance,
            mensualiteTotale: mensualiteAssurance,
            resteARembourser: soldeRestant,
            versementSupplementaire: 0,
            versementTotal: mensualiteAssurance,
            interetsCumules: interetsCumules,
            annee: annee
        });
    }
    
    // Période de différé partiel (remboursement des intérêts et de l'assurance)
    for (let i = 1; i <= differePartiel; i++) {
        const dateEcheance = new Date(dateActuelle);
        dateEcheance.setMonth(dateActuelle.getMonth() + differeTotal + i);
        const annee = Math.ceil((differeTotal + i) / 12);
        
        const interets = soldeRestant * tauxMensuel;
        interetsCumules += interets;
        
        tableau.push({
            numero: differeTotal + i,
            date: `${dateEcheance.getMonth() + 1}/${dateEcheance.getFullYear()}`,
            soldeInitial: soldeRestant,
            mensualite: interets,
            capitalRembourse: 0,
            interets: interets,
            mensualiteAssurance: mensualiteAssurance,
            mensualiteTotale: interets + mensualiteAssurance,
            resteARembourser: soldeRestant,
            versementSupplementaire: 0,
            versementTotal: interets + mensualiteAssurance,
            interetsCumules: interetsCumules,
            annee: annee
        });
    }
    
    // Période d'amortissement normal
    for (let i = 1; i <= dureeEnMois - differeTotal - differePartiel; i++) {
        const dateEcheance = new Date(dateActuelle);
        dateEcheance.setMonth(dateActuelle.getMonth() + differeTotal + differePartiel + i);
        const annee = Math.ceil((differeTotal + differePartiel + i) / 12);
        
        const interets = soldeRestant * tauxMensuel;
        interetsCumules += interets;
        const capitalRembourse = mensualiteHorsAssurance - interets;
        soldeRestant -= capitalRembourse;
        
        // Ajustement pour le dernier mois (arrondi)
        if (i === dureeEnMois - differeTotal - differePartiel) {
            soldeRestant = 0;
        }
        
        tableau.push({
            numero: differeTotal + differePartiel + i,
            date: `${dateEcheance.getMonth() + 1}/${dateEcheance.getFullYear()}`,
            soldeInitial: soldeRestant + capitalRembourse,
            mensualite: mensualiteHorsAssurance,
            capitalRembourse: capitalRembourse,
            interets: interets,
            mensualiteAssurance: mensualiteAssurance,
            mensualiteTotale: mensualiteHorsAssurance + mensualiteAssurance,
            resteARembourser: soldeRestant,
            versementSupplementaire: 0,
            versementTotal: mensualiteHorsAssurance + mensualiteAssurance,
            interetsCumules: interetsCumules,
            annee: annee
        });
    }
    
    return tableau;
}

// Éléments DOM
// Données du bien
const prixBienFAIInput = document.getElementById('prixBienFAI') as HTMLInputElement;
const fraisAgenceInput = document.getElementById('fraisAgence') as HTMLInputElement;
const montantTravauxInput = document.getElementById('montantTravaux') as HTMLInputElement;
const fraisNotaireInput = document.getElementById('fraisNotaire') as HTMLInputElement;
const revenuMensuelNetInput = document.getElementById('revenuMensuelNet') as HTMLInputElement;

// Prêt 1
const nomBanque1Input = document.getElementById('nomBanque1') as HTMLInputElement;
const apport1Input = document.getElementById('apport1') as HTMLInputElement;
const fraisDossier1Input = document.getElementById('fraisDossier1') as HTMLInputElement;
const fraisGarantie1Input = document.getElementById('fraisGarantie1') as HTMLInputElement;
const tauxNominal1Input = document.getElementById('tauxNominal1') as HTMLInputElement;
const tauxAssurance1Input = document.getElementById('tauxAssurance1') as HTMLInputElement;
const dureePret1Input = document.getElementById('dureePret1') as HTMLInputElement;
const dureePret1Value = document.getElementById('dureePret1Value') as HTMLSpanElement;
const differeTotal1Input = document.getElementById('differeTotal1') as HTMLInputElement;
const differeTotal1Value = document.getElementById('differeTotal1Value') as HTMLSpanElement;
const differePartiel1Input = document.getElementById('differePartiel1') as HTMLInputElement;
const differePartiel1Value = document.getElementById('differePartiel1Value') as HTMLSpanElement;
const resultsContent1 = document.getElementById('resultsContent1') as HTMLDivElement;
const echeancierContent1 = document.getElementById('echeancierContent1') as HTMLDivElement;
const amortissementContent1 = document.getElementById('amortissementContent1') as HTMLDivElement;
const tabBanque1 = document.getElementById('tabBanque1') as HTMLSpanElement;
const pagination1 = document.getElementById('pagination1') as HTMLDivElement;
const rowsPerPage1 = document.getElementById('rowsPerPage1') as HTMLSelectElement;

// Prêt 2
const nomBanque2Input = document.getElementById('nomBanque2') as HTMLInputElement;
const apport2Input = document.getElementById('apport2') as HTMLInputElement;
const fraisDossier2Input = document.getElementById('fraisDossier2') as HTMLInputElement;
const fraisGarantie2Input = document.getElementById('fraisGarantie2') as HTMLInputElement;
const tauxNominal2Input = document.getElementById('tauxNominal2') as HTMLInputElement;
const tauxAssurance2Input = document.getElementById('tauxAssurance2') as HTMLInputElement;
const dureePret2Input = document.getElementById('dureePret2') as HTMLInputElement;
const dureePret2Value = document.getElementById('dureePret2Value') as HTMLSpanElement;
const differeTotal2Input = document.getElementById('differeTotal2') as HTMLInputElement;
const differeTotal2Value = document.getElementById('differeTotal2Value') as HTMLSpanElement;
const differePartiel2Input = document.getElementById('differePartiel2') as HTMLInputElement;
const differePartiel2Value = document.getElementById('differePartiel2Value') as HTMLSpanElement;
const resultsContent2 = document.getElementById('resultsContent2') as HTMLDivElement;
const echeancierContent2 = document.getElementById('echeancierContent2') as HTMLDivElement;
const amortissementContent2 = document.getElementById('amortissementContent2') as HTMLDivElement;
const tabBanque2 = document.getElementById('tabBanque2') as HTMLSpanElement;
const pagination2 = document.getElementById('pagination2') as HTMLDivElement;
const rowsPerPage2 = document.getElementById('rowsPerPage2') as HTMLSelectElement;

// Tableau de comparaison
const comparisonTable = document.getElementById('comparisonTable') as HTMLTableElement;

// Onglets
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');

// Bouton de partage (remplace le bouton de téléchargement)
const shareBtn = document.getElementById('downloadBtn') as HTMLButtonElement;
if (shareBtn) {
    shareBtn.textContent = 'Générer un lien public';
}

// Variables pour stocker les résultats des calculs
let resultat1: ResultatCalcul | null = null;
let resultat2: ResultatCalcul | null = null;
let tableauAmortissement1: LigneAmortissement[] = [];
let tableauAmortissement2: LigneAmortissement[] = [];
let echeancier1: EcheancierPeriode[] = [];
let echeancier2: EcheancierPeriode[] = [];
let comparaison: ComparaisonPrets | null = null;

// Variables pour la pagination
let currentPage1 = 1;
let currentPage2 = 1;

// Fonction pour formater les nombres en euros
function formatEuro(value: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);
}

// Fonction pour formater les pourcentages
function formatPercent(value: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

// Fonction pour récupérer les données du bien
function getBienData(): BienData {
    return {
        prixBienFAI: parseFloat(prixBienFAIInput.value) || 0,
        fraisAgence: parseFloat(fraisAgenceInput.value) || 0,
        montantTravaux: parseFloat(montantTravauxInput.value) || 0,
        fraisNotaire: parseFloat(fraisNotaireInput.value) || 0,
        revenuMensuelNet: parseFloat(revenuMensuelNetInput.value) || 0
    };
}

// Fonction pour récupérer les données du prêt 1
function getPret1Data(): PretData {
    return {
        nomBanque: nomBanque1Input.value,
        apport: parseFloat(apport1Input.value) || 0,
        fraisDossier: parseFloat(fraisDossier1Input.value) || 0,
        fraisGarantie: parseFloat(fraisGarantie1Input.value) || 0,
        tauxNominal: parseFloat(tauxNominal1Input.value) / 100 || 0,
        tauxAssurance: parseFloat(tauxAssurance1Input.value) / 100 || 0,
        dureePret: parseInt(dureePret1Input.value) || 0,
        differeTotal: parseInt(differeTotal1Input.value) || 0,
        differePartiel: parseInt(differePartiel1Input.value) || 0
    };
}

// Fonction pour récupérer les données du prêt 2
function getPret2Data(): PretData {
    return {
        nomBanque: nomBanque2Input.value,
        apport: parseFloat(apport2Input.value) || 0,
        fraisDossier: parseFloat(fraisDossier2Input.value) || 0,
        fraisGarantie: parseFloat(fraisGarantie2Input.value) || 0,
        tauxNominal: parseFloat(tauxNominal2Input.value) / 100 || 0,
        tauxAssurance: parseFloat(tauxAssurance2Input.value) / 100 || 0,
        dureePret: parseInt(dureePret2Input.value) || 0,
        differeTotal: parseInt(differeTotal2Input.value) || 0,
        differePartiel: parseInt(differePartiel2Input.value) || 0
    };
}

// Fonction pour calculer la comparaison entre les deux prêts
function calculerComparaison(): ComparaisonPrets | null {
    if (!resultat1 || !resultat2) return null;
    
    const bienData = getBienData();
    
    return {
        taegHorsAssurance: {
            pret1: resultat1.taeg,
            pret2: resultat2.taeg,
            difference: resultat1.taeg - resultat2.taeg
        },
        taegAvecAssurance: {
            pret1: resultat1.taegAvecAssurance,
            pret2: resultat2.taegAvecAssurance,
            difference: resultat1.taegAvecAssurance - resultat2.taegAvecAssurance
        },
        mensualiteTotale: {
            pret1: resultat1.mensualiteTotale,
            pret2: resultat2.mensualiteTotale,
            difference: resultat1.mensualiteTotale - resultat2.mensualiteTotale
        },
        coutTotalCredit: {
            pret1: resultat1.montantTotalInterets,
            pret2: resultat2.montantTotalInterets,
            difference: resultat1.montantTotalInterets - resultat2.montantTotalInterets
        },
        tauxEndettement: {
            pret1: resultat1.mensualiteTotale / bienData.revenuMensuelNet,
            pret2: resultat2.mensualiteTotale / bienData.revenuMensuelNet,
            difference: (resultat1.mensualiteTotale - resultat2.mensualiteTotale) / bienData.revenuMensuelNet
        },
        dureePret: {
            pret1: getPret1Data().dureePret,
            pret2: getPret2Data().dureePret,
            difference: getPret1Data().dureePret - getPret2Data().dureePret
        }
    };
}

// Fonction pour afficher les résultats du prêt 1
function afficherResultats1() {
    const bienData = getBienData();
    const pretData = getPret1Data();
    
    const montantEmprunt = calculerMontantEmprunt(bienData, pretData);
    resultat1 = calculerMensualites(montantEmprunt, pretData);
    
    // Mise à jour du nom de la banque dans les onglets
    tabBanque1.textContent = pretData.nomBanque;
    
    // Affichage des résultats
    resultsContent1.innerHTML = `
        <p><strong>Montant de l'emprunt:</strong> ${formatEuro(resultat1.montantEmprunt)}</p>
        <p><strong>Taux nominal:</strong> ${formatPercent(resultat1.tauxNominal)}</p>
        <p><strong>TAEG (hors assurance):</strong> ${formatPercent(resultat1.taeg)}</p>
        <p><strong>TAEG (avec assurance):</strong> ${formatPercent(resultat1.taegAvecAssurance)}</p>
        <p><strong>TAEA:</strong> ${formatPercent(resultat1.tauxAssurance)}</p>
        <p><strong>Taux d'endettement:</strong> ${formatPercent(resultat1.mensualiteTotale / bienData.revenuMensuelNet)}</p>
        <p><strong>Coût total du crédit:</strong> ${formatEuro(resultat1.montantTotalInterets)}</p>
    `;
    
    // Génération de l'échéancier
    echeancier1 = genererEcheancierSimple(montantEmprunt, pretData);
    afficherEcheancier(echeancier1, echeancierContent1);
    
    // Génération du tableau d'amortissement
    if (pretData.differeTotal > 0 && pretData.differePartiel > 0) {
        tableauAmortissement1 = calculerTableauAmortissementAvecDiffereCombine(montantEmprunt, pretData);
    } else if (pretData.differeTotal > 0) {
        tableauAmortissement1 = calculerTableauAmortissementAvecDiffereTotal(montantEmprunt, pretData);
    } else if (pretData.differePartiel > 0) {
        tableauAmortissement1 = calculerTableauAmortissementAvecDifferePartiel(montantEmprunt, pretData);
    } else {
        tableauAmortissement1 = calculerTableauAmortissement(montantEmprunt, pretData);
    }
    
    afficherTableauAmortissement(tableauAmortissement1, amortissementContent1, parseInt(rowsPerPage1.value), currentPage1, pagination1);
    
    // Mise à jour du tableau de comparaison si les deux prêts sont calculés
    if (resultat2) {
        comparaison = calculerComparaison();
        afficherComparaison();
    }
}

// Fonction pour afficher les résultats du prêt 2
function afficherResultats2() {
    const bienData = getBienData();
    const pretData = getPret2Data();
    
    const montantEmprunt = calculerMontantEmprunt(bienData, pretData);
    resultat2 = calculerMensualites(montantEmprunt, pretData);
    
    // Mise à jour du nom de la banque dans les onglets
    tabBanque2.textContent = pretData.nomBanque;
    
    // Affichage des résultats
    resultsContent2.innerHTML = `
        <p><strong>Montant de l'emprunt:</strong> ${formatEuro(resultat2.montantEmprunt)}</p>
        <p><strong>Taux nominal:</strong> ${formatPercent(resultat2.tauxNominal)}</p>
        <p><strong>TAEG (hors assurance):</strong> ${formatPercent(resultat2.taeg)}</p>
        <p><strong>TAEG (avec assurance):</strong> ${formatPercent(resultat2.taegAvecAssurance)}</p>
        <p><strong>TAEA:</strong> ${formatPercent(resultat2.tauxAssurance)}</p>
        <p><strong>Taux d'endettement:</strong> ${formatPercent(resultat2.mensualiteTotale / bienData.revenuMensuelNet)}</p>
        <p><strong>Coût total du crédit:</strong> ${formatEuro(resultat2.montantTotalInterets)}</p>
    `;
    
    // Génération de l'échéancier
    echeancier2 = genererEcheancierSimple(montantEmprunt, pretData);
    afficherEcheancier(echeancier2, echeancierContent2);
    
    // Génération du tableau d'amortissement
    if (pretData.differeTotal > 0 && pretData.differePartiel > 0) {
        tableauAmortissement2 = calculerTableauAmortissementAvecDiffereCombine(montantEmprunt, pretData);
    } else if (pretData.differeTotal > 0) {
        tableauAmortissement2 = calculerTableauAmortissementAvecDiffereTotal(montantEmprunt, pretData);
    } else if (pretData.differePartiel > 0) {
        tableauAmortissement2 = calculerTableauAmortissementAvecDifferePartiel(montantEmprunt, pretData);
    } else {
        tableauAmortissement2 = calculerTableauAmortissement(montantEmprunt, pretData);
    }
    
    afficherTableauAmortissement(tableauAmortissement2, amortissementContent2, parseInt(rowsPerPage2.value), currentPage2, pagination2);
    
    // Mise à jour du tableau de comparaison si les deux prêts sont calculés
    if (resultat1) {
        comparaison = calculerComparaison();
        afficherComparaison();
    }
}

// Fonction pour afficher l'échéancier
function afficherEcheancier(echeancier: EcheancierPeriode[], container: HTMLElement) {
    let html = `
        <table class="echeancier-table">
            <thead>
                <tr>
                    <th>PÉRIODE</th>
                    <th>ÉCHÉANCE MENSUELLE HORS ASSURANCE</th>
                    <th>ÉCHÉANCE MENSUELLE ASSURANCE COMPRISE</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    echeancier.forEach(periode => {
        html += `
            <tr>
                <td>${periode.periode}</td>
                <td>${formatEuro(periode.echeanceHorsAssurance)}</td>
                <td>${formatEuro(periode.echeanceAvecAssurance)}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

// Fonction pour afficher le tableau d'amortissement avec pagination
function afficherTableauAmortissement(tableau: LigneAmortissement[], container: HTMLElement, rowsPerPage: number, currentPage: number, paginationContainer: HTMLElement) {
    // Calcul du nombre total de pages
    const totalPages = Math.ceil(tableau.length / rowsPerPage);
    
    // Ajustement de la page courante si nécessaire
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }
    
    // Calcul des indices de début et de fin pour la page courante
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, tableau.length);
    
    // Extraction des lignes pour la page courante
    const currentRows = tableau.slice(startIndex, endIndex);
    
    // Génération du tableau HTML
    let html = `
        <table>
            <thead>
                <tr>
                    <th>N°</th>
                    <th>Date</th>
                    <th>Solde initial</th>
                    <th>Mensualité</th>
                    <th>Capital</th>
                    <th>Intérêts</th>
                    <th>Assurance</th>
                    <th>Total</th>
                    <th>Reste à rembourser</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    currentRows.forEach(ligne => {
        html += `
            <tr>
                <td>${ligne.numero}</td>
                <td>${ligne.date}</td>
                <td>${formatEuro(ligne.soldeInitial)}</td>
                <td>${formatEuro(ligne.mensualite)}</td>
                <td>${formatEuro(ligne.capitalRembourse)}</td>
                <td>${formatEuro(ligne.interets)}</td>
                <td>${formatEuro(ligne.mensualiteAssurance)}</td>
                <td>${formatEuro(ligne.mensualiteTotale)}</td>
                <td>${formatEuro(ligne.resteARembourser)}</td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
    
    // Génération des contrôles de pagination
    let paginationHtml = `
        <div class="pagination-controls">
            <div class="pagination-buttons">
                <button class="pagination-button" data-page="first" ${currentPage === 1 ? 'disabled' : ''}>«</button>
                <button class="pagination-button" data-page="prev" ${currentPage === 1 ? 'disabled' : ''}>‹</button>
    `;
    
    // Affichage des numéros de page (max 5 pages autour de la page courante)
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `
            <button class="pagination-button ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>
        `;
    }
    
    paginationHtml += `
                <button class="pagination-button" data-page="next" ${currentPage === totalPages ? 'disabled' : ''}>›</button>
                <button class="pagination-button" data-page="last" ${currentPage === totalPages ? 'disabled' : ''}>»</button>
            </div>
            <div class="rows-per-page">
                <span>Lignes par page:</span>
                <select>
                    <option value="10" ${rowsPerPage === 10 ? 'selected' : ''}>10</option>
                    <option value="25" ${rowsPerPage === 25 ? 'selected' : ''}>25</option>
                    <option value="50" ${rowsPerPage === 50 ? 'selected' : ''}>50</option>
                    <option value="100" ${rowsPerPage === 100 ? 'selected' : ''}>100</option>
                </select>
            </div>
        </div>
    `;
    
    paginationContainer.innerHTML = paginationHtml;
    
    // Ajout des écouteurs d'événements pour les boutons de pagination
    const buttons = paginationContainer.querySelectorAll('.pagination-button');
    buttons.forEach(button => {
        button.addEventListener('click', (e) => {
            const target = e.target as HTMLButtonElement;
            const page = target.dataset.page;
            
            if (page === 'first') {
                if (container === amortissementContent1) {
                    currentPage1 = 1;
                    afficherTableauAmortissement(tableauAmortissement1, container, rowsPerPage, currentPage1, paginationContainer);
                } else {
                    currentPage2 = 1;
                    afficherTableauAmortissement(tableauAmortissement2, container, rowsPerPage, currentPage2, paginationContainer);
                }
            } else if (page === 'prev') {
                if (container === amortissementContent1) {
                    currentPage1--;
                    afficherTableauAmortissement(tableauAmortissement1, container, rowsPerPage, currentPage1, paginationContainer);
                } else {
                    currentPage2--;
                    afficherTableauAmortissement(tableauAmortissement2, container, rowsPerPage, currentPage2, paginationContainer);
                }
            } else if (page === 'next') {
                if (container === amortissementContent1) {
                    currentPage1++;
                    afficherTableauAmortissement(tableauAmortissement1, container, rowsPerPage, currentPage1, paginationContainer);
                } else {
                    currentPage2++;
                    afficherTableauAmortissement(tableauAmortissement2, container, rowsPerPage, currentPage2, paginationContainer);
                }
            } else if (page === 'last') {
                if (container === amortissementContent1) {
                    currentPage1 = totalPages;
                    afficherTableauAmortissement(tableauAmortissement1, container, rowsPerPage, currentPage1, paginationContainer);
                } else {
                    currentPage2 = totalPages;
                    afficherTableauAmortissement(tableauAmortissement2, container, rowsPerPage, currentPage2, paginationContainer);
                }
            } else {
                const pageNum = parseInt(page || '1');
                if (container === amortissementContent1) {
                    currentPage1 = pageNum;
                    afficherTableauAmortissement(tableauAmortissement1, container, rowsPerPage, currentPage1, paginationContainer);
                } else {
                    currentPage2 = pageNum;
                    afficherTableauAmortissement(tableauAmortissement2, container, rowsPerPage, currentPage2, paginationContainer);
                }
            }
        });
    });
    
    // Ajout d'un écouteur d'événement pour le sélecteur de lignes par page
    const select = paginationContainer.querySelector('select');
    if (select) {
        select.addEventListener('change', (e) => {
            const target = e.target as HTMLSelectElement;
            const newRowsPerPage = parseInt(target.value);
            
            if (container === amortissementContent1) {
                rowsPerPage1.value = target.value;
                afficherTableauAmortissement(tableauAmortissement1, container, newRowsPerPage, 1, paginationContainer);
            } else {
                rowsPerPage2.value = target.value;
                afficherTableauAmortissement(tableauAmortissement2, container, newRowsPerPage, 1, paginationContainer);
            }
        });
    }
}

// Fonction pour afficher la comparaison des prêts
function afficherComparaison() {
    if (!comparaison) return;
    
    const pret1Data = getPret1Data();
    const pret2Data = getPret2Data();
    
    let html = `
        <tr>
            <th>CRITÈRE</th>
            <th>BANQUE ${pret1Data.nomBanque}</th>
            <th>BANQUE ${pret2Data.nomBanque}</th>
            <th>DIFFÉRENCE</th>
        </tr>
        <tr>
            <td>TAEG (hors assurance)</td>
            <td>${formatPercent(comparaison.taegHorsAssurance.pret1)}</td>
            <td>${formatPercent(comparaison.taegHorsAssurance.pret2)}</td>
            <td class="${comparaison.taegHorsAssurance.difference > 0 ? 'negative' : (comparaison.taegHorsAssurance.difference < 0 ? 'positive' : 'neutral')}">${formatPercent(Math.abs(comparaison.taegHorsAssurance.difference))}</td>
        </tr>
        <tr>
            <td>TAEG (avec assurance)</td>
            <td>${formatPercent(comparaison.taegAvecAssurance.pret1)}</td>
            <td>${formatPercent(comparaison.taegAvecAssurance.pret2)}</td>
            <td class="${comparaison.taegAvecAssurance.difference > 0 ? 'negative' : (comparaison.taegAvecAssurance.difference < 0 ? 'positive' : 'neutral')}">${formatPercent(Math.abs(comparaison.taegAvecAssurance.difference))}</td>
        </tr>
        <tr>
            <td>Mensualité totale</td>
            <td>${formatEuro(comparaison.mensualiteTotale.pret1)}</td>
            <td>${formatEuro(comparaison.mensualiteTotale.pret2)}</td>
            <td class="${comparaison.mensualiteTotale.difference > 0 ? 'negative' : (comparaison.mensualiteTotale.difference < 0 ? 'positive' : 'neutral')}">${formatEuro(Math.abs(comparaison.mensualiteTotale.difference))}</td>
        </tr>
        <tr>
            <td>Coût total du crédit</td>
            <td>${formatEuro(comparaison.coutTotalCredit.pret1)}</td>
            <td>${formatEuro(comparaison.coutTotalCredit.pret2)}</td>
            <td class="${comparaison.coutTotalCredit.difference > 0 ? 'negative' : (comparaison.coutTotalCredit.difference < 0 ? 'positive' : 'neutral')}">${formatEuro(Math.abs(comparaison.coutTotalCredit.difference))}</td>
        </tr>
        <tr>
            <td>Taux d'endettement</td>
            <td>${formatPercent(comparaison.tauxEndettement.pret1)}</td>
            <td>${formatPercent(comparaison.tauxEndettement.pret2)}</td>
            <td class="${comparaison.tauxEndettement.difference > 0 ? 'negative' : (comparaison.tauxEndettement.difference < 0 ? 'positive' : 'neutral')}">${formatPercent(Math.abs(comparaison.tauxEndettement.difference))}</td>
        </tr>
        <tr>
            <td>Durée du prêt</td>
            <td>${comparaison.dureePret.pret1} ans</td>
            <td>${comparaison.dureePret.pret2} ans</td>
            <td class="${comparaison.dureePret.difference > 0 ? 'negative' : (comparaison.dureePret.difference < 0 ? 'positive' : 'neutral')}">${Math.abs(comparaison.dureePret.difference)} ans</td>
        </tr>
    `;
    
    comparisonTable.innerHTML = html;
}

// Fonction pour générer un PDF de la simulation
function genererPDF() {
    if (!resultat1) {
        alert('Veuillez calculer au moins un prêt avant de télécharger la simulation.');
        return;
    }
    
    const bienData = getBienData();
    const pret1Data = getPret1Data();
    const pret2Data = getPret2Data();
    
    const doc = new jsPDF();
    
    // Titre
    doc.setFontSize(20);
    doc.text('Simulation de Prêts Immobiliers', 105, 20, { align: 'center' });
    
    // Données du bien
    doc.setFontSize(16);
    let yPos = 40;
    doc.text('Données du bien', 20, yPos);
    
    doc.setFontSize(12);
    yPos += 10;
    doc.text(`Prix du bien FAI: ${formatEuro(bienData.prixBienFAI)}`, 20, yPos);
    yPos += 6;
    doc.text(`Frais d'agence: ${formatEuro(bienData.fraisAgence)}`, 20, yPos);
    yPos += 6;
    doc.text(`Montant des travaux: ${formatEuro(bienData.montantTravaux)}`, 20, yPos);
    yPos += 6;
    doc.text(`Frais de notaire: ${formatEuro(bienData.fraisNotaire)}`, 20, yPos);
    yPos += 6;
    doc.text(`Revenu mensuel net: ${formatEuro(bienData.revenuMensuelNet)}`, 20, yPos);
    
    // Résultats Prêt 1
    doc.setFontSize(16);
    yPos += 20;
    doc.text(`Prêt 1 - ${pret1Data.nomBanque}`, 20, yPos);
    
    doc.setFontSize(12);
    yPos += 10;
    doc.text(`Apport: ${formatEuro(pret1Data.apport)}`, 20, yPos);
    yPos += 6;
    doc.text(`Frais de dossier: ${formatEuro(pret1Data.fraisDossier)}`, 20, yPos);
    yPos += 6;
    doc.text(`Frais de garantie: ${formatEuro(pret1Data.fraisGarantie)}`, 20, yPos);
    yPos += 6;
    doc.text(`Taux nominal: ${formatPercent(pret1Data.tauxNominal)}`, 20, yPos);
    yPos += 6;
    doc.text(`Taux assurance: ${formatPercent(pret1Data.tauxAssurance)}`, 20, yPos);
    yPos += 6;
    doc.text(`Durée du prêt: ${pret1Data.dureePret} ans`, 20, yPos);
    yPos += 6;
    doc.text(`Différé total: ${pret1Data.differeTotal} mois`, 20, yPos);
    yPos += 6;
    doc.text(`Différé partiel: ${pret1Data.differePartiel} mois`, 20, yPos);
    
    doc.setFontSize(14);
    yPos += 10;
    doc.text('Résultats', 20, yPos);
    
    doc.setFontSize(12);
    yPos += 8;
    doc.text(`Montant emprunté: ${formatEuro(resultat1.montantEmprunt)}`, 20, yPos);
    yPos += 6;
    doc.text(`Mensualité (hors assurance): ${formatEuro(resultat1.mensualiteHorsAssurance)}`, 20, yPos);
    yPos += 6;
    doc.text(`Mensualité d'assurance: ${formatEuro(resultat1.mensualiteAssurance)}`, 20, yPos);
    yPos += 6;
    doc.text(`Mensualité totale: ${formatEuro(resultat1.mensualiteTotale)}`, 20, yPos);
    yPos += 6;
    doc.text(`Taux d'endettement: ${formatPercent(resultat1.mensualiteTotale / bienData.revenuMensuelNet)}`, 20, yPos);
    yPos += 6;
    doc.text(`Coût total du crédit: ${formatEuro(resultat1.montantTotalInterets)}`, 20, yPos);
    yPos += 6;
    doc.text(`TAEG: ${formatPercent(resultat1.taeg)}`, 20, yPos);
    yPos += 6;
    doc.text(`TAEG avec assurance: ${formatPercent(resultat1.taegAvecAssurance)}`, 20, yPos);
    
    yPos += 10;
    
    // Nouvelle page si nécessaire
    if (yPos > 250 && resultat2) {
        doc.addPage();
        yPos = 20;
    }
    
    // Résultats Prêt 2
    if (resultat2) {
        doc.setFontSize(16);
        doc.text(`Prêt 2 - ${pret2Data.nomBanque}`, 20, yPos);
        
        doc.setFontSize(12);
        yPos += 10;
        doc.text(`Apport: ${formatEuro(pret2Data.apport)}`, 20, yPos);
        yPos += 6;
        doc.text(`Frais de dossier: ${formatEuro(pret2Data.fraisDossier)}`, 20, yPos);
        yPos += 6;
        doc.text(`Frais de garantie: ${formatEuro(pret2Data.fraisGarantie)}`, 20, yPos);
        yPos += 6;
        doc.text(`Taux nominal: ${formatPercent(pret2Data.tauxNominal)}`, 20, yPos);
        yPos += 6;
        doc.text(`Taux assurance: ${formatPercent(pret2Data.tauxAssurance)}`, 20, yPos);
        yPos += 6;
        doc.text(`Durée du prêt: ${pret2Data.dureePret} ans`, 20, yPos);
        yPos += 6;
        doc.text(`Différé total: ${pret2Data.differeTotal} mois`, 20, yPos);
        yPos += 6;
        doc.text(`Différé partiel: ${pret2Data.differePartiel} mois`, 20, yPos);
        
        doc.setFontSize(14);
        yPos += 10;
        doc.text('Résultats', 20, yPos);
        
        doc.setFontSize(12);
        yPos += 8;
        doc.text(`Montant emprunté: ${formatEuro(resultat2.montantEmprunt)}`, 20, yPos);
        yPos += 6;
        doc.text(`Mensualité (hors assurance): ${formatEuro(resultat2.mensualiteHorsAssurance)}`, 20, yPos);
        yPos += 6;
        doc.text(`Mensualité d'assurance: ${formatEuro(resultat2.mensualiteAssurance)}`, 20, yPos);
        yPos += 6;
        doc.text(`Mensualité totale: ${formatEuro(resultat2.mensualiteTotale)}`, 20, yPos);
        yPos += 6;
        doc.text(`Taux d'endettement: ${formatPercent(resultat2.mensualiteTotale / bienData.revenuMensuelNet)}`, 20, yPos);
        yPos += 6;
        doc.text(`Coût total du crédit: ${formatEuro(resultat2.montantTotalInterets)}`, 20, yPos);
        yPos += 6;
        doc.text(`TAEG: ${formatPercent(resultat2.taeg)}`, 20, yPos);
        yPos += 6;
        doc.text(`TAEG avec assurance: ${formatPercent(resultat2.taegAvecAssurance)}`, 20, yPos);
        
        yPos += 10;
    }
    
    // Nouvelle page pour la comparaison
    if (resultat1 && resultat2 && comparaison) {
        doc.addPage();
        
        doc.setFontSize(16);
        doc.text('Comparaison des prêts', 105, 20, { align: 'center' });
        
        // Tableau de comparaison
        const comparisonData = [
            ['CRITÈRE', `BANQUE ${pret1Data.nomBanque}`, `BANQUE ${pret2Data.nomBanque}`, 'DIFFÉRENCE'],
            ['TAEG (hors assurance)', 
             formatPercent(comparaison.taegHorsAssurance.pret1), 
             formatPercent(comparaison.taegHorsAssurance.pret2), 
             formatPercent(Math.abs(comparaison.taegHorsAssurance.difference))],
            ['TAEG (avec assurance)', 
             formatPercent(comparaison.taegAvecAssurance.pret1), 
             formatPercent(comparaison.taegAvecAssurance.pret2), 
             formatPercent(Math.abs(comparaison.taegAvecAssurance.difference))],
            ['Mensualité totale', 
             formatEuro(comparaison.mensualiteTotale.pret1), 
             formatEuro(comparaison.mensualiteTotale.pret2), 
             formatEuro(Math.abs(comparaison.mensualiteTotale.difference))],
            ['Coût total du crédit', 
             formatEuro(comparaison.coutTotalCredit.pret1), 
             formatEuro(comparaison.coutTotalCredit.pret2), 
             formatEuro(Math.abs(comparaison.coutTotalCredit.difference))],
            ['Taux d\'endettement', 
             formatPercent(comparaison.tauxEndettement.pret1), 
             formatPercent(comparaison.tauxEndettement.pret2), 
             formatPercent(Math.abs(comparaison.tauxEndettement.difference))],
            ['Durée du prêt', 
             `${comparaison.dureePret.pret1} ans`, 
             `${comparaison.dureePret.pret2} ans`, 
             `${Math.abs(comparaison.dureePret.difference)} ans`]
        ];
        
        const result = doc.autoTable({
            startY: 30,
            head: [comparisonData[0]],
            body: comparisonData.slice(1),
            theme: 'grid',
            headStyles: { fillColor: [51, 102, 204], textColor: 255 },
            styles: { halign: 'center' },
            columnStyles: {
                0: { halign: 'left' }
            }
        });
        
        // Échéanciers
        if (echeancier1.length > 0) {
            doc.addPage();
            
            doc.setFontSize(16);
            doc.text(`Échéancier - ${pret1Data.nomBanque}`, 105, 20, { align: 'center' });
            
            const echeancierData = [
                ['PÉRIODE', 'ÉCHÉANCE MENSUELLE HORS ASSURANCE', 'ÉCHÉANCE MENSUELLE ASSURANCE COMPRISE']
            ];
            
            echeancier1.forEach(periode => {
                echeancierData.push([
                    periode.periode,
                    formatEuro(periode.echeanceHorsAssurance),
                    formatEuro(periode.echeanceAvecAssurance)
                ]);
            });
            
            const result = doc.autoTable({
                startY: 30,
                head: [echeancierData[0]],
                body: echeancierData.slice(1),
                theme: 'grid',
                headStyles: { fillColor: [51, 102, 204], textColor: 255 }
            });
        }
        
        if (echeancier2.length > 0) {
            doc.addPage();
            
            doc.setFontSize(16);
            doc.text(`Échéancier - ${pret2Data.nomBanque}`, 105, 20, { align: 'center' });
            
            const echeancierData = [
                ['PÉRIODE', 'ÉCHÉANCE MENSUELLE HORS ASSURANCE', 'ÉCHÉANCE MENSUELLE ASSURANCE COMPRISE']
            ];
            
            echeancier2.forEach(periode => {
                echeancierData.push([
                    periode.periode,
                    formatEuro(periode.echeanceHorsAssurance),
                    formatEuro(periode.echeanceAvecAssurance)
                ]);
            });
            
            const result = doc.autoTable({
                startY: 30,
                head: [echeancierData[0]],
                body: echeancierData.slice(1),
                theme: 'grid',
                headStyles: { fillColor: [156, 39, 176], textColor: 255 }
            });
        }
        
        // Tableaux d'amortissement (limités aux 20 premières lignes)
        if (tableauAmortissement1.length > 0) {
            doc.addPage();
            
            doc.setFontSize(16);
            doc.text(`Tableau d'amortissement - ${pret1Data.nomBanque}`, 105, 20, { align: 'center' });
            
            const amortissementData = [
                ['N°', 'Date', 'Solde initial', 'Mensualité', 'Capital', 'Intérêts', 'Assurance', 'Total', 'Reste à rembourser']
            ];
            
            // Limiter à 20 lignes pour le PDF
            const limitedTable = tableauAmortissement1.slice(0, 20);
            
            limitedTable.forEach(ligne => {
                amortissementData.push([
                    ligne.numero.toString(),
                    ligne.date,
                    formatEuro(ligne.soldeInitial),
                    formatEuro(ligne.mensualite),
                    formatEuro(ligne.capitalRembourse),
                    formatEuro(ligne.interets),
                    formatEuro(ligne.mensualiteAssurance),
                    formatEuro(ligne.mensualiteTotale),
                    formatEuro(ligne.resteARembourser)
                ]);
            });
            
            const result = doc.autoTable({
                startY: 30,
                head: [amortissementData[0]],
                body: amortissementData.slice(1),
                theme: 'grid',
                headStyles: { fillColor: [51, 102, 204], textColor: 255 },
                styles: { fontSize: 8 }
            });
            
            doc.setFontSize(10);
            doc.text(`Affichage 1 à ${limitedTable.length} sur ${tableauAmortissement1.length} lignes`, 20, result.previous.finalY + 10);
        }
        
        if (tableauAmortissement2.length > 0) {
            doc.addPage();
            
            doc.setFontSize(16);
            doc.text(`Tableau d'amortissement - ${pret2Data.nomBanque}`, 105, 20, { align: 'center' });
            
            const amortissementData = [
                ['N°', 'Date', 'Solde initial', 'Mensualité', 'Capital', 'Intérêts', 'Assurance', 'Total', 'Reste à rembourser']
            ];
            
            // Limiter à 20 lignes pour le PDF
            const limitedTable = tableauAmortissement2.slice(0, 20);
            
            limitedTable.forEach(ligne => {
                amortissementData.push([
                    ligne.numero.toString(),
                    ligne.date,
                    formatEuro(ligne.soldeInitial),
                    formatEuro(ligne.mensualite),
                    formatEuro(ligne.capitalRembourse),
                    formatEuro(ligne.interets),
                    formatEuro(ligne.mensualiteAssurance),
                    formatEuro(ligne.mensualiteTotale),
                    formatEuro(ligne.resteARembourser)
                ]);
            });
            
            const result = doc.autoTable({
                startY: 30,
                head: [amortissementData[0]],
                body: amortissementData.slice(1),
                theme: 'grid',
                headStyles: { fillColor: [156, 39, 176], textColor: 255 },
                styles: { fontSize: 8 }
            });
            
            doc.setFontSize(10);
            doc.text(`Affichage 1 à ${limitedTable.length} sur ${tableauAmortissement2.length} lignes`, 20, result.previous.finalY + 10);
        }
    }
    
    // Pied de page
    doc.setFontSize(10);
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text('© 2025 Simulateur de Prêts Immobiliers - Créé par Pierre Georgel', 105, 285, { align: 'center' });
        doc.text(`Page ${i} / ${pageCount}`, 195, 285, { align: 'right' });
    }
    
    // Téléchargement du PDF
    doc.save('simulation_prets_immobiliers.pdf');
}

// Mise à jour des valeurs affichées pour les sliders
function updateSliderValues() {
    dureePret1Value.textContent = `${dureePret1Input.value} ans`;
    differeTotal1Value.textContent = `${differeTotal1Input.value} mois`;
    differePartiel1Value.textContent = `${differePartiel1Input.value} mois`;
    
    dureePret2Value.textContent = `${dureePret2Input.value} ans`;
    differeTotal2Value.textContent = `${differeTotal2Input.value} mois`;
    differePartiel2Value.textContent = `${differePartiel2Input.value} mois`;
}

// Gestion des onglets
function setupTabs() {
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Retirer la classe active de tous les onglets et contenus
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            // Ajouter la classe active à l'onglet cliqué et au contenu correspondant
            tab.classList.add('active');
            const tabId = tab.getAttribute('data-tab');
            const tabContent = document.getElementById(tabId);
            if (tabContent) {
                tabContent.classList.add('active');
            }
        });
    });
}

// Fonctions pour l'encodage et le décodage des paramètres URL
function encodeSimulationToURL(): string {
    const bienData = getBienData();
    const pret1Data = getPret1Data();
    const pret2Data = getPret2Data();
    
    // Création d'un objet contenant toutes les données de la simulation
    const simulationData = {
        bien: bienData,
        pret1: pret1Data,
        pret2: pret2Data
    };
    
    // Conversion de l'objet en chaîne JSON
    const jsonData = JSON.stringify(simulationData);
    
    // Encodage en base64 pour éviter les problèmes de caractères spéciaux dans l'URL
    const encodedData = btoa(jsonData);
    
    // Construction de l'URL avec les données encodées
    const baseUrl = window.location.origin + window.location.pathname;
    return `${baseUrl}?sim=${encodedData}`;
}

function decodeSimulationFromURL(): boolean {
    // Récupération des paramètres de l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const encodedData = urlParams.get('sim');
    
    if (!encodedData) return false;
    
    try {
        // Décodage des données
        const jsonData = atob(encodedData);
        const simulationData = JSON.parse(jsonData);
        
        // Vérification de la structure des données
        if (!simulationData.bien || !simulationData.pret1) return false;
        
        // Mise à jour des champs du formulaire avec les données décodées
        // Données du bien
        prixBienFAIInput.value = simulationData.bien.prixBienFAI.toString();
        fraisAgenceInput.value = simulationData.bien.fraisAgence.toString();
        montantTravauxInput.value = simulationData.bien.montantTravaux.toString();
        fraisNotaireInput.value = simulationData.bien.fraisNotaire.toString();
        revenuMensuelNetInput.value = simulationData.bien.revenuMensuelNet.toString();
        
        // Données du prêt 1
        nomBanque1Input.value = simulationData.pret1.nomBanque;
        apport1Input.value = simulationData.pret1.apport.toString();
        fraisDossier1Input.value = simulationData.pret1.fraisDossier.toString();
        fraisGarantie1Input.value = simulationData.pret1.fraisGarantie.toString();
        tauxNominal1Input.value = (simulationData.pret1.tauxNominal * 100).toString();
        tauxAssurance1Input.value = (simulationData.pret1.tauxAssurance * 100).toString();
        dureePret1Input.value = simulationData.pret1.dureePret.toString();
        differeTotal1Input.value = simulationData.pret1.differeTotal.toString();
        differePartiel1Input.value = simulationData.pret1.differePartiel.toString();
        
        // Données du prêt 2 (si présentes)
        if (simulationData.pret2) {
            nomBanque2Input.value = simulationData.pret2.nomBanque;
            apport2Input.value = simulationData.pret2.apport.toString();
            fraisDossier2Input.value = simulationData.pret2.fraisDossier.toString();
            fraisGarantie2Input.value = simulationData.pret2.fraisGarantie.toString();
            tauxNominal2Input.value = (simulationData.pret2.tauxNominal * 100).toString();
            tauxAssurance2Input.value = (simulationData.pret2.tauxAssurance * 100).toString();
            dureePret2Input.value = simulationData.pret2.dureePret.toString();
            differeTotal2Input.value = simulationData.pret2.differeTotal.toString();
            differePartiel2Input.value = simulationData.pret2.differePartiel.toString();
        }
        
        // Mise à jour des valeurs des sliders
        updateSliderValues();
        
        // Calcul et affichage des résultats
        afficherResultats1();
        if (simulationData.pret2) {
            afficherResultats2();
        }
        
        return true;
    } catch (error) {
        console.error('Erreur lors du décodage des données de simulation:', error);
        return false;
    }
}

// Fonction pour créer et afficher la popup de partage
function afficherPopupPartage() {
    if (!resultat1) {
        alert('Veuillez calculer au moins un prêt avant de générer un lien de partage.');
        return;
    }
    
    // Génération de l'URL de partage
    const shareUrl = encodeSimulationToURL();
    
    // Création de la popup
    const popupOverlay = document.createElement('div');
    popupOverlay.className = 'popup-overlay';
    
    const popupContent = document.createElement('div');
    popupContent.className = 'popup-content';
    
    const popupTitle = document.createElement('h3');
    popupTitle.textContent = 'Lien de partage de la simulation';
    
    const popupText = document.createElement('p');
    popupText.textContent = 'Copiez ce lien pour partager votre simulation :';
    
    const linkContainer = document.createElement('div');
    linkContainer.className = 'link-container';
    
    const linkInput = document.createElement('input');
    linkInput.type = 'text';
    linkInput.value = shareUrl;
    linkInput.readOnly = true;
    
    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copier';
    copyButton.addEventListener('click', () => {
        linkInput.select();
        document.execCommand('copy');
        copyButton.textContent = 'Copié !';
        setTimeout(() => {
            copyButton.textContent = 'Copier';
        }, 2000);
    });
    
    const closeButton = document.createElement('button');
    closeButton.textContent = 'Fermer';
    closeButton.addEventListener('click', () => {
        document.body.removeChild(popupOverlay);
    });
    
    // Assemblage de la popup
    linkContainer.appendChild(linkInput);
    linkContainer.appendChild(copyButton);
    
    popupContent.appendChild(popupTitle);
    popupContent.appendChild(popupText);
    popupContent.appendChild(linkContainer);
    popupContent.appendChild(closeButton);
    
    popupOverlay.appendChild(popupContent);
    
    // Ajout de la popup au document
    document.body.appendChild(popupOverlay);
    
    // Sélection automatique du lien
    linkInput.select();
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    // Vérification si l'URL contient des paramètres de simulation
    const hasSimulationData = decodeSimulationFromURL();
    
    // Configuration des écouteurs d'événements
    // Mise à jour des valeurs des sliders
    dureePret1Input.addEventListener('input', updateSliderValues);
    differeTotal1Input.addEventListener('input', updateSliderValues);
    differePartiel1Input.addEventListener('input', updateSliderValues);
    
    dureePret2Input.addEventListener('input', updateSliderValues);
    differeTotal2Input.addEventListener('input', updateSliderValues);
    differePartiel2Input.addEventListener('input', updateSliderValues);
    
    // Calcul des résultats lors de la modification des champs
    const inputsPret1 = [
        prixBienFAIInput, fraisAgenceInput, montantTravauxInput, fraisNotaireInput, revenuMensuelNetInput,
        nomBanque1Input, apport1Input, fraisDossier1Input, fraisGarantie1Input, tauxNominal1Input,
        tauxAssurance1Input, dureePret1Input, differeTotal1Input, differePartiel1Input
    ];
    
    inputsPret1.forEach(input => {
        input.addEventListener('input', () => {
            afficherResultats1();
        });
    });
    
    const inputsPret2 = [
        nomBanque2Input, apport2Input, fraisDossier2Input, fraisGarantie2Input, tauxNominal2Input,
        tauxAssurance2Input, dureePret2Input, differeTotal2Input, differePartiel2Input
    ];
    
    inputsPret2.forEach(input => {
        input.addEventListener('input', () => {
            afficherResultats2();
        });
    });
    
    // Configuration des onglets
    setupTabs();
    
    // Configuration du bouton de partage
    if (shareBtn) {
        shareBtn.addEventListener('click', afficherPopupPartage);
    }
    
    // Initialisation des valeurs des sliders
    updateSliderValues();
    
    // Calcul initial des résultats si aucune donnée n'a été chargée depuis l'URL
    if (!hasSimulationData) {
        afficherResultats1();
    }
});

// Ajout de styles CSS pour la popup
const popupStyles = document.createElement('style');
popupStyles.textContent = `
    .popup-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }
    
    .popup-content {
        background-color: white;
        padding: 2rem;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        max-width: 90%;
        width: 500px;
    }
    
    .popup-content h3 {
        margin-top: 0;
        color: var(--primary-color);
    }
    
    .link-container {
        display: flex;
        margin: 1rem 0;
    }
    
    .link-container input {
        flex: 1;
        padding: 0.75rem;
        border: 1px solid var(--border-color);
        border-radius: 4px 0 0 4px;
        font-size: 0.9rem;
    }
    
    .link-container button {
        padding: 0.75rem 1rem;
        background-color: var(--primary-color);
        color: white;
        border: none;
        border-radius: 0 4px 4px 0;
        cursor: pointer;
        font-weight: 500;
    }
    
    .popup-content > button {
        display: block;
        margin: 1rem auto 0;
        padding: 0.75rem 1.5rem;
        background-color: var(--light-gray);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        cursor: pointer;
        font-weight: 500;
    }
    
    .popup-content > button:hover {
        background-color: var(--medium-gray);
    }
    
    @media (max-width: 768px) {
        .popup-content {
            width: 90%;
            padding: 1.5rem;
        }
        
        .link-container {
            flex-direction: column;
        }
        
        .link-container input {
            border-radius: 4px;
            margin-bottom: 0.5rem;
        }
        
        .link-container button {
            border-radius: 4px;
        }
    }
`;

document.head.appendChild(popupStyles);
