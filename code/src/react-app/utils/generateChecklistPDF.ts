import jsPDF from 'jspdf';
import type { ChecklistWithPhotos } from '../../shared/checklist-types';

export async function generateChecklistPDF(
  checklist: ChecklistWithPhotos,
  clientSignatureUrl: string,
  collaboratorSignatureUrl: string
) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const headerHeight = 35; // Increased for header image
  const footerHeight = 20; // Increased for footer image
  const topMargin = headerHeight + 5;
  const bottomMargin = footerHeight + 10;
  let yPosition = topMargin;
  let currentPage = 1;

  // Load header and footer images
  const headerImageUrl = '/assets/cabeca.png';
  const footerImageUrl = '/assets/final.png';
  
  let headerImage: string | null = null;
  let footerImage: string | null = null;
  
  try {
    // Load header and footer images (allow failure - PDF will generate without them)
    headerImage = await loadImageFromUrl(headerImageUrl).catch(() => null);
    footerImage = await loadImageFromUrl(footerImageUrl).catch(() => null);
  } catch (error) {
    console.warn('Could not load header/footer images, continuing without them:', error);
  }

  // Helper to add header to current page
  const addHeader = () => {
    if (headerImage) {
      try {
        const headerWidth = pageWidth - (2 * margin);
        const headerX = margin;
        const headerY = 5;
        pdf.addImage(headerImage, 'PNG', headerX, headerY, headerWidth, headerHeight);
      } catch (error) {
        console.warn('Error adding header to page:', error);
      }
    }
  };

  // Helper to add footer to current page
  const addFooter = () => {
    if (footerImage) {
      try {
        const footerWidth = pageWidth - (2 * margin);
        const footerX = margin;
        const footerY = pageHeight - footerHeight - 5;
        pdf.addImage(footerImage, 'PNG', footerX, footerY, footerWidth, footerHeight);
      } catch (error) {
        console.warn('Error adding footer to page:', error);
      }
    }
  };

  // Add header and footer to first page
  addHeader();
  addFooter();

  // Helper to check if we need a new page
  const checkPageBreak = (spaceNeeded: number) => {
    if (yPosition + spaceNeeded > pageHeight - bottomMargin) {
      pdf.addPage();
      currentPage++;
      addHeader();
      addFooter();
      yPosition = topMargin;
      return true;
    }
    return false;
  };

  // Helper to add text with wrapping
  const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number = 5) => {
    const lines = pdf.splitTextToSize(text, maxWidth);
    
    for (let i = 0; i < lines.length; i++) {
      if (checkPageBreak(lineHeight + 2)) {
        y = yPosition;
      }
      pdf.text(lines[i], x, y + (i * lineHeight));
    }
    
    return y + (lines.length * lineHeight);
  };

  // Title
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TERMO DE CIÊNCIA E CONCORDÂNCIA', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  pdf.setFontSize(12);
  pdf.text('CHECKLIST DE CHEGADA DE VEÍCULO / EQUIPAMENTO', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 12;

  // Date (without time)
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(checklist.created_at));
  
  pdf.text(`Data: ${formattedDate}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Section 1: OBJETIVO DO CHECKLIST
  checkPageBreak(35);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('1. OBJETIVO DO CHECKLIST', margin, yPosition);
  yPosition += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  
  const section1 = `Este checklist tem como finalidade registrar, de forma detalhada, transparente e documental, as condições gerais do veículo ou equipamento no momento de sua chegada às dependências da empresa, visando:

• Garantir a segurança jurídica e operacional da empresa e do cliente;
• Prevenir divergências, reclamações ou litígios futuros;
• Registrar avarias aparentes e condições funcionais observáveis no ato da entrada;
• Estabelecer limites claros de responsabilidade entre as partes.`;

  yPosition = addWrappedText(section1, margin, yPosition, pageWidth - (2 * margin), 5);
  yPosition += 8;

  // Section 2: ABRANGÊNCIA DA VISTORIA
  checkPageBreak(55);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('2. ABRANGÊNCIA DA VISTORIA', margin, yPosition);
  yPosition += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const section2intro = 'O checklist contempla, mas não se limita, às seguintes verificações:';
  yPosition = addWrappedText(section2intro, margin, yPosition, pageWidth - (2 * margin), 5);
  yPosition += 6;

  // 2.1
  checkPageBreak(35);
  pdf.setFont('helvetica', 'bold');
  pdf.text('2.1 Condições Externas (Estéticas e Estruturais)', margin + 3, yPosition);
  yPosition += 5;
  pdf.setFont('helvetica', 'normal');
  const section21 = `• Amassados, riscos, trincas, arranhões ou deformações;
• Estado de pintura, adesivos e identificação visual;
• Condição de vidros, para-brisas, lanternas e faróis;
• Estado de pneus, rodas e estepe;
• Presença de corrosão, ferrugem ou danos estruturais aparentes.`;
  yPosition = addWrappedText(section21, margin + 3, yPosition, pageWidth - (2 * margin) - 3, 5);
  yPosition += 6;

  // 2.2
  checkPageBreak(30);
  pdf.setFont('helvetica', 'bold');
  pdf.text('2.2 Condições Internas', margin + 3, yPosition);
  yPosition += 5;
  pdf.setFont('helvetica', 'normal');
  const section22 = `• Estado de bancos, painéis, forros e acabamentos;
• Funcionamento básico de comandos internos;
• Presença de objetos pessoais, ferramentas ou acessórios soltos;
• Condição de sistemas multimídia, rádio, telas e comandos.`;
  yPosition = addWrappedText(section22, margin + 3, yPosition, pageWidth - (2 * margin) - 3, 5);
  yPosition += 6;

  // 2.3
  checkPageBreak(35);
  pdf.setFont('helvetica', 'bold');
  pdf.text('2.3 Condições Mecânicas Aparentes', margin + 3, yPosition);
  yPosition += 5;
  pdf.setFont('helvetica', 'normal');
  const section23 = `• Funcionamento do motor no momento da chegada (quando aplicável);
• Ruídos anormais, vibrações ou falhas perceptíveis;
• Vazamentos aparentes de óleo, combustível, fluídos ou água;
• Condição visual de mangueiras, correias, conexões e chicotes elétricos;
• Estado aparente do sistema de arrefecimento, admissão e escapamento.`;
  yPosition = addWrappedText(section23, margin + 3, yPosition, pageWidth - (2 * margin) - 3, 5);
  yPosition += 6;

  // 2.4
  checkPageBreak(25);
  pdf.setFont('helvetica', 'bold');
  pdf.text('2.4 Sistemas Elétricos e Eletrônicos', margin + 3, yPosition);
  yPosition += 5;
  pdf.setFont('helvetica', 'normal');
  const section24 = `• Funcionamento aparente de luzes, setas e sinalizações;
• Presença de alertas ou falhas no painel;
• Integridade visual de sensores, módulos e conectores.`;
  yPosition = addWrappedText(section24, margin + 3, yPosition, pageWidth - (2 * margin) - 3, 5);
  yPosition += 8;

  // Section 3: LIMITAÇÕES DA VISTORIA
  checkPageBreak(45);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('3. LIMITAÇÕES DA VISTORIA', margin, yPosition);
  yPosition += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const section3 = `Fica expressamente reconhecido que:

• O checklist não substitui diagnóstico técnico aprofundado;
• A vistoria se limita a avaliações visuais e funcionais básicas, realizadas sem desmontagem;
• Falhas internas, ocultas, intermitentes ou não perceptíveis no momento da chegada podem ser identificadas somente durante desmontagem, testes ou uso posterior;
• O checklist não caracteriza laudo técnico ou perícia mecânica.`;
  yPosition = addWrappedText(section3, margin, yPosition, pageWidth - (2 * margin), 5);
  yPosition += 8;

  // Section 4: RESPONSABILIDADE SOBRE OBJETOS
  checkPageBreak(30);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('4. RESPONSABILIDADE SOBRE OBJETOS E ACESSÓRIOS', margin, yPosition);
  yPosition += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const section4 = `• A empresa não se responsabiliza por objetos pessoais deixados no interior do veículo ou equipamento;
• Itens não declarados ou não registrados no checklist não poderão ser reclamados posteriormente;
• A retirada de objetos pessoais é de responsabilidade exclusiva do proprietário/motorista.`;
  yPosition = addWrappedText(section4, margin, yPosition, pageWidth - (2 * margin), 5);
  yPosition += 8;

  // Section 5: REGISTRO FOTOGRÁFICO
  checkPageBreak(28);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('5. REGISTRO FOTOGRÁFICO', margin, yPosition);
  yPosition += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const section5 = `• O checklist é acompanhado de registro fotográfico, que passa a integrar este documento;
• As imagens representam o estado do veículo no momento da chegada, servindo como prova documental;
• Fotos adicionais poderão ser realizadas durante o processo, se necessário.`;
  yPosition = addWrappedText(section5, margin, yPosition, pageWidth - (2 * margin), 5);
  yPosition += 8;

  // Section 6: CIÊNCIA E CONCORDÂNCIA
  checkPageBreak(50);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('6. CIÊNCIA E CONCORDÂNCIA', margin, yPosition);
  yPosition += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const section6 = `Declaro que:

• Li, compreendi e estou de acordo com todas as informações registradas neste checklist;
• Reconheço que as condições aqui descritas representam o estado do veículo/equipamento no momento da entrada;
• Estou ciente das limitações da vistoria e das responsabilidades atribuídas a cada parte;
• Autorizo o registro fotográfico e documental para fins operacionais, legais e de controle interno.

A assinatura deste termo implica ciência plena e concordância com seu conteúdo.`;
  yPosition = addWrappedText(section6, margin, yPosition, pageWidth - (2 * margin), 5);
  yPosition += 8;

  // Section 7: DADOS DO CHECKLIST
  checkPageBreak(55);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('7. DADOS DO CHECKLIST', margin, yPosition);
  yPosition += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Data: ${formattedDate}`, margin + 3, yPosition);
  yPosition += 5;
  pdf.text(`Checklist ID: #${checklist.id}`, margin + 3, yPosition);
  yPosition += 5;
  pdf.text(`OS nº: ${checklist.id}`, margin + 3, yPosition);
  yPosition += 5;
  const isMachinery = checklist.equipment_category === 'machinery';
  pdf.text(`${isMachinery ? 'Maquinário' : 'Veículo'} / Equipamento: ${checklist.brand_model}`, margin + 3, yPosition);
  yPosition += 5;
  const identifier = checklist.license_plate || checklist.equipment_identifier || 'N/A';
  pdf.text(`${checklist.license_plate ? 'Placa' : 'Identificação'}: ${identifier}`, margin + 3, yPosition);
  yPosition += 5;
  pdf.text(`Colaborador Responsável: ${checklist.user_name || 'N/A'}`, margin + 3, yPosition);
  yPosition += 10;

  if (checklist.initial_observations) {
    checkPageBreak(25);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Observações Iniciais:', margin + 3, yPosition);
    yPosition += 5;
    pdf.setFont('helvetica', 'normal');
    yPosition = addWrappedText(checklist.initial_observations, margin + 3, yPosition, pageWidth - (2 * margin) - 3, 5);
    yPosition += 8;
  }

  // Section 8: ASSINATURAS
  // Always start signatures on a new page to ensure nothing is cut off
  pdf.addPage();
  currentPage++;
  addHeader();
  addFooter();
  yPosition = topMargin;

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('8. ASSINATURAS', margin, yPosition);
  yPosition += 12;

  // Client/Owner Signature
  try {
    const clientImg = await loadImage(clientSignatureUrl);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text('Assinatura do Proprietário/Motorista:', margin, yPosition);
    yPosition += 8;
    
    const imgWidth = 80;
    const imgHeight = 35;
    
    // Ensure we have space for the signature box
    checkPageBreak(imgHeight + 15);
    
    // Draw signature box
    pdf.setDrawColor(150, 150, 150);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, yPosition, imgWidth, imgHeight);
    
    // Add signature image inside box
    pdf.addImage(clientImg, 'PNG', margin + 2, yPosition + 2, imgWidth - 4, imgHeight - 4);
    
    yPosition += imgHeight + 3;
    
    // Signature line
    pdf.setDrawColor(0, 0, 0);
    pdf.line(margin, yPosition, margin + imgWidth, yPosition);
    yPosition += 5;
    pdf.setFontSize(8);
    pdf.text('Proprietário/Motorista', margin, yPosition);
    yPosition += 20;
  } catch (error) {
    console.error('Error loading client signature:', error);
    yPosition += 50;
  }

  // Collaborator Signature
  try {
    const collabImg = await loadImage(collaboratorSignatureUrl);
    
    // Ensure we have enough space for collaborator signature
    checkPageBreak(65);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text('Assinatura do Colaborador Responsável:', margin, yPosition);
    yPosition += 8;
    
    const imgWidth = 80;
    const imgHeight = 35;
    
    // Draw signature box
    pdf.setDrawColor(150, 150, 150);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, yPosition, imgWidth, imgHeight);
    
    // Add signature image inside box
    pdf.addImage(collabImg, 'PNG', margin + 2, yPosition + 2, imgWidth - 4, imgHeight - 4);
    
    yPosition += imgHeight + 3;
    
    // Signature line
    pdf.setDrawColor(0, 0, 0);
    pdf.line(margin, yPosition, margin + imgWidth, yPosition);
    yPosition += 5;
    pdf.setFontSize(8);
    pdf.text('Colaborador Responsável', margin, yPosition);
    
    if (checklist.user_name) {
      yPosition += 4;
      pdf.text(`Nome: ${checklist.user_name}`, margin, yPosition);
    }
  } catch (error) {
    console.error('Error loading collaborator signature:', error);
  }

  // Save PDF
  const fileIdentifier = checklist.license_plate || checklist.equipment_identifier || checklist.id;
  const filename = `Termo_Checklist_${fileIdentifier}_${formattedDate.replace(/\//g, '-')}.pdf`;
  pdf.save(filename);
}

// Helper function to load image from URL (for header/footer)
async function loadImageFromUrl(url: string): Promise<string> {
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  
  const blob = await response.blob();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert image to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Helper function to load image with credentials
async function loadImage(url: string): Promise<string> {
  const response = await fetch(url, {
    credentials: 'include',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  
  const blob = await response.blob();
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to convert image to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
