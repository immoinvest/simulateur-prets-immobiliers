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

// Bouton de téléchargement
const downloadBtn = document.getElementById('downloadBtn') as HTMLButtonElement;

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
    if (pretData.differeTotal > 0) {
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
    if (pretData.differeTotal > 0) {
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
function afficherTableauAmortissement(
    tableau: LigneAmortissement[], 
    container: HTMLElement, 
    rowsPerPage: number, 
    currentPage: number, 
    paginationContainer: HTMLElement
) {
    // Calcul des indices de début et de fin pour la pagination
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const tableauPage = tableau.slice(startIndex, endIndex);
    
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
    
    tableauPage.forEach(ligne => {
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
    
    // Génération des boutons de pagination
    const totalPages = Math.ceil(tableau.length / rowsPerPage);
    let paginationHtml = '';
    
    // Bouton précédent
    paginationHtml += `
        <button class="pagination-button ${currentPage === 1 ? 'disabled' : ''}" 
                data-page="prev" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // Pages
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    if (startPage > 1) {
        paginationHtml += `
            <button class="pagination-button" data-page="1">1</button>
            ${startPage > 2 ? '<span>...</span>' : ''}
        `;
    }
    
    for (let i = startPage; i <= endPage; i++) {
        paginationHtml += `
            <button class="pagination-button ${i === currentPage ? 'active' : ''}" 
                    data-page="${i}">
                ${i}
            </button>
        `;
    }
    
    if (endPage < totalPages) {
        paginationHtml += `
            ${endPage < totalPages - 1 ? '<span>...</span>' : ''}
            <button class="pagination-button" data-page="${totalPages}">${totalPages}</button>
        `;
    }
    
    // Bouton suivant
    paginationHtml += `
        <button class="pagination-button ${currentPage === totalPages ? 'disabled' : ''}" 
                data-page="next" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    paginationContainer.innerHTML = paginationHtml;
    
    // Ajout des événements aux boutons de pagination
    const paginationButtons = paginationContainer.querySelectorAll('.pagination-button');
    paginationButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLElement;
            const page = target.getAttribute('data-page');
            
            if (page === 'prev') {
                if (currentPage > 1) {
                    if (paginationContainer === pagination1) {
                        currentPage1--;
                        afficherTableauAmortissement(tableauAmortissement1, amortissementContent1, parseInt(rowsPerPage1.value), currentPage1, pagination1);
                    } else {
                        currentPage2--;
                        afficherTableauAmortissement(tableauAmortissement2, amortissementContent2, parseInt(rowsPerPage2.value), currentPage2, pagination2);
                    }
                }
            } else if (page === 'next') {
                if (currentPage < totalPages) {
                    if (paginationContainer === pagination1) {
                        currentPage1++;
                        afficherTableauAmortissement(tableauAmortissement1, amortissementContent1, parseInt(rowsPerPage1.value), currentPage1, pagination1);
                    } else {
                        currentPage2++;
                        afficherTableauAmortissement(tableauAmortissement2, amortissementContent2, parseInt(rowsPerPage2.value), currentPage2, pagination2);
                    }
                }
            } else if (page) {
                const pageNum = parseInt(page);
                if (paginationContainer === pagination1) {
                    currentPage1 = pageNum;
                    afficherTableauAmortissement(tableauAmortissement1, amortissementContent1, parseInt(rowsPerPage1.value), currentPage1, pagination1);
                } else {
                    currentPage2 = pageNum;
                    afficherTableauAmortissement(tableauAmortissement2, amortissementContent2, parseInt(rowsPerPage2.value), currentPage2, pagination2);
                }
            }
        });
    });
}

// Fonction pour afficher le tableau de comparaison
function afficherComparaison() {
    if (!comparaison) return;
    
    const pret1Data = getPret1Data();
    const pret2Data = getPret2Data();
    
    const tbody = comparisonTable.querySelector('tbody');
    if (!tbody) return;
    
    tbody.innerHTML = `
        <tr>
            <td>TAEG (hors assurance)</td>
            <td>${formatPercent(comparaison.taegHorsAssurance.pret1)}</td>
            <td>${formatPercent(comparaison.taegHorsAssurance.pret2)}</td>
            <td class="${comparaison.taegHorsAssurance.difference > 0 ? 'negative' : comparaison.taegHorsAssurance.difference < 0 ? 'positive' : 'neutral'}">
                ${formatPercent(Math.abs(comparaison.taegHorsAssurance.difference))}
            </td>
        </tr>
        <tr>
            <td>TAEG (avec assurance)</td>
            <td>${formatPercent(comparaison.taegAvecAssurance.pret1)}</td>
            <td>${formatPercent(comparaison.taegAvecAssurance.pret2)}</td>
            <td class="${comparaison.taegAvecAssurance.difference > 0 ? 'negative' : comparaison.taegAvecAssurance.difference < 0 ? 'positive' : 'neutral'}">
                ${formatPercent(Math.abs(comparaison.taegAvecAssurance.difference))}
            </td>
        </tr>
        <tr>
            <td>Mensualité totale</td>
            <td>${formatEuro(comparaison.mensualiteTotale.pret1)}</td>
            <td>${formatEuro(comparaison.mensualiteTotale.pret2)}</td>
            <td class="${comparaison.mensualiteTotale.difference > 0 ? 'negative' : comparaison.mensualiteTotale.difference < 0 ? 'positive' : 'neutral'}">
                ${formatEuro(Math.abs(comparaison.mensualiteTotale.difference))}
            </td>
        </tr>
        <tr>
            <td>Coût total du crédit</td>
            <td>${formatEuro(comparaison.coutTotalCredit.pret1)}</td>
            <td>${formatEuro(comparaison.coutTotalCredit.pret2)}</td>
            <td class="${comparaison.coutTotalCredit.difference > 0 ? 'negative' : comparaison.coutTotalCredit.difference < 0 ? 'positive' : 'neutral'}">
                ${formatEuro(Math.abs(comparaison.coutTotalCredit.difference))}
            </td>
        </tr>
        <tr>
            <td>Taux d'endettement</td>
            <td>${formatPercent(comparaison.tauxEndettement.pret1)}</td>
            <td>${formatPercent(comparaison.tauxEndettement.pret2)}</td>
            <td class="${comparaison.tauxEndettement.difference > 0 ? 'negative' : comparaison.tauxEndettement.difference < 0 ? 'positive' : 'neutral'}">
                ${formatPercent(Math.abs(comparaison.tauxEndettement.difference))}
            </td>
        </tr>
        <tr>
            <td>Durée du prêt</td>
            <td>${comparaison.dureePret.pret1} ans</td>
            <td>${comparaison.dureePret.pret2} ans</td>
            <td class="${comparaison.dureePret.difference > 0 ? 'negative' : comparaison.dureePret.difference < 0 ? 'positive' : 'neutral'}">
                ${Math.abs(comparaison.dureePret.difference)} ans
            </td>
        </tr>
    `;
}

// Fonction pour générer le PDF
function genererPDF() {
    if (!resultat1 && !resultat2) {
        alert('Veuillez calculer au moins un prêt avant de télécharger la simulation.');
        return;
    }
    
    const bienData = getBienData();
    const pret1Data = getPret1Data();
    const pret2Data = getPret2Data();
    
    // Création du document PDF
    const doc = new jsPDF();
    
    // Titre
    doc.setFontSize(20);
    doc.text('Simulateur de Prêts Immobiliers - Comparaison', 105, 20, { align: 'center' });
    
    // Date de simulation
    doc.setFontSize(12);
    doc.text(`Date de simulation: ${new Date().toLocaleDateString('fr-FR')}`, 105, 30, { align: 'center' });
    
    // Données du bien
    doc.setFontSize(16);
    doc.text('Données du bien', 20, 40);
    
    doc.setFontSize(12);
    doc.text(`Prix du bien FAI: ${formatEuro(bienData.prixBienFAI)}`, 20, 50);
    doc.text(`Frais d'agence: ${formatEuro(bienData.fraisAgence)}`, 20, 56);
    doc.text(`Montant des travaux: ${formatEuro(bienData.montantTravaux)}`, 20, 62);
    doc.text(`Frais de notaire: ${formatEuro(bienData.fraisNotaire)}`, 20, 68);
    doc.text(`Revenu mensuel net: ${formatEuro(bienData.revenuMensuelNet)}`, 20, 74);
    
    let yPos = 84;
    
    // Résultats Prêt 1
    if (resultat1) {
        doc.setFontSize(16);
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
    }
    
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
            if (tabId) {
                const content = document.getElementById(tabId);
                if (content) content.classList.add('active');
            }
        });
    });
}

// Initialisation
function init() {
    // Mise à jour initiale des valeurs des sliders
    updateSliderValues();
    
    // Configuration des onglets
    setupTabs();
    
    // Événements pour les sliders
    dureePret1Input.addEventListener('input', () => {
        dureePret1Value.textContent = `${dureePret1Input.value} ans`;
        afficherResultats1();
    });
    
    differeTotal1Input.addEventListener('input', () => {
        differeTotal1Value.textContent = `${differeTotal1Input.value} mois`;
        afficherResultats1();
    });
    
    differePartiel1Input.addEventListener('input', () => {
        differePartiel1Value.textContent = `${differePartiel1Input.value} mois`;
        afficherResultats1();
    });
    
    dureePret2Input.addEventListener('input', () => {
        dureePret2Value.textContent = `${dureePret2Input.value} ans`;
        afficherResultats2();
    });
    
    differeTotal2Input.addEventListener('input', () => {
        differeTotal2Value.textContent = `${differeTotal2Input.value} mois`;
        afficherResultats2();
    });
    
    differePartiel2Input.addEventListener('input', () => {
        differePartiel2Value.textContent = `${differePartiel2Input.value} mois`;
        afficherResultats2();
    });
    
    // Événements pour les champs de saisie du bien
    [prixBienFAIInput, fraisAgenceInput, montantTravauxInput, fraisNotaireInput, revenuMensuelNetInput].forEach(input => {
        input.addEventListener('input', () => {
            afficherResultats1();
            afficherResultats2();
        });
    });
    
    // Événements pour les champs de saisie du prêt 1
    [nomBanque1Input, apport1Input, fraisDossier1Input, fraisGarantie1Input, tauxNominal1Input, tauxAssurance1Input].forEach(input => {
        input.addEventListener('input', afficherResultats1);
    });
    
    // Événements pour les champs de saisie du prêt 2
    [nomBanque2Input, apport2Input, fraisDossier2Input, fraisGarantie2Input, tauxNominal2Input, tauxAssurance2Input].forEach(input => {
        input.addEventListener('input', afficherResultats2);
    });
    
    // Événement pour le changement du nombre de lignes par page
    rowsPerPage1.addEventListener('change', () => {
        currentPage1 = 1; // Réinitialiser à la première page
        afficherTableauAmortissement(tableauAmortissement1, amortissementContent1, parseInt(rowsPerPage1.value), currentPage1, pagination1);
    });
    
    rowsPerPage2.addEventListener('change', () => {
        currentPage2 = 1; // Réinitialiser à la première page
        afficherTableauAmortissement(tableauAmortissement2, amortissementContent2, parseInt(rowsPerPage2.value), currentPage2, pagination2);
    });
    
    // Événement pour le bouton de téléchargement
    downloadBtn.addEventListener('click', genererPDF);
    
    // Calcul initial
    afficherResultats1();
    afficherResultats2();
}

// Lancement de l'initialisation quand le DOM est chargé
document.addEventListener('DOMContentLoaded', init);
