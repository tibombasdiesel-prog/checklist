import jsPDF from 'jspdf';

interface FleetChecklist {
  id: number;
  checklist_type: string;
  driver_name: string;
  inspection_date: string;
  vehicle: string;
  company: string;
  general_condition: string;
  rear_lights: string;
  front_lights: string;
  safety_items: string;
  motor_items: string;
  observations: string;
  created_at: string;
}

interface DamageMark {
  id: number;
  vehicle_side: string;
  x_position: number;
  y_position: number;
  observation: string;
  photos?: Array<{
    id: number;
    r2_key: string;
  }>;
}

export async function generateFleetChecklistPDF(
  checklist: FleetChecklist,
  damageMarks: DamageMark[]
) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 15;
  const headerHeight = 35;
  const footerHeight = 20;
  const topMargin = headerHeight + 5;
  const bottomMargin = footerHeight + 10;
  let yPosition = topMargin;

  // Load header and footer images
  const headerImageUrl = '/assets/cabeca.png';
  const footerImageUrl = '/assets/final.png';
  
  let headerImage: string | null = null;
  let footerImage: string | null = null;
  
  try {
    headerImage = await loadImageFromUrl(headerImageUrl).catch(() => null);
    footerImage = await loadImageFromUrl(footerImageUrl).catch(() => null);
  } catch (error) {
    console.warn('Could not load header/footer images:', error);
  }

  // Helper to add header
  const addHeader = () => {
    if (headerImage) {
      try {
        const headerWidth = pageWidth - (2 * margin);
        pdf.addImage(headerImage, 'PNG', margin, 5, headerWidth, headerHeight);
      } catch (error) {
        console.warn('Error adding header:', error);
      }
    }
  };

  // Helper to add footer
  const addFooter = () => {
    if (footerImage) {
      try {
        const footerWidth = pageWidth - (2 * margin);
        const footerY = pageHeight - footerHeight - 5;
        pdf.addImage(footerImage, 'PNG', margin, footerY, footerWidth, footerHeight);
      } catch (error) {
        console.warn('Error adding footer:', error);
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

  const parseJSON = (jsonString: string) => {
    try {
      return JSON.parse(jsonString);
    } catch {
      return {};
    }
  };

  const isEntrada = checklist.checklist_type === 'entrada';

  // Title
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CHECKLIST DE VISTORIA DE VEÍCULO', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 6;
  pdf.setFontSize(12);
  pdf.text(isEntrada ? 'ENTRADA DE VEÍCULO' : 'SAÍDA DE VEÍCULO', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 12;

  // Date
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(checklist.inspection_date));
  
  pdf.text(`Data da Vistoria: ${formattedDate}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  // Basic Information
  checkPageBreak(35);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('INFORMAÇÕES BÁSICAS', margin, yPosition);
  yPosition += 6;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Veículo: ${checklist.vehicle}`, margin + 3, yPosition);
  yPosition += 5;
  pdf.text(`Empresa/Proprietário: ${checklist.company}`, margin + 3, yPosition);
  yPosition += 5;
  pdf.text(`Motorista: ${checklist.driver_name}`, margin + 3, yPosition);
  yPosition += 5;
  pdf.text(`Checklist ID: #${checklist.id}`, margin + 3, yPosition);
  yPosition += 10;

  // Estado Geral
  checkPageBreak(45);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ESTADO GERAL', margin, yPosition);
  yPosition += 6;

  const generalState = parseJSON(checklist.general_condition);
  const items = [
    { label: 'Limpeza', data: generalState.cleanliness },
    { label: 'Pneus', data: generalState.tires },
    { label: 'Combustível', data: generalState.fuel },
    { label: 'Documentação', data: generalState.documentation },
  ];

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  items.forEach(item => {
    const status = item.data?.ok ? '✓ OK' : item.data?.problems ? '✗ Com Problemas' : '- Não Verificado';
    pdf.text(`${item.label}: ${status}`, margin + 3, yPosition);
    yPosition += 5;
  });
  yPosition += 5;

  // Luzes
  checkPageBreak(25);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('LUZES', margin, yPosition);
  yPosition += 6;

  const frontLights = parseJSON(checklist.front_lights);
  const rearLights = parseJSON(checklist.rear_lights);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const frontStatus = frontLights.ok ? '✓ OK' : frontLights.problems ? '✗ Com Problemas' : '- Não Verificado';
  const rearStatus = rearLights.ok ? '✓ OK' : rearLights.problems ? '✗ Com Problemas' : '- Não Verificado';
  pdf.text(`Luzes Dianteiras: ${frontStatus}`, margin + 3, yPosition);
  yPosition += 5;
  pdf.text(`Luzes Traseiras: ${rearStatus}`, margin + 3, yPosition);
  yPosition += 10;

  // Segurança
  checkPageBreak(35);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ITENS DE SEGURANÇA', margin, yPosition);
  yPosition += 6;

  const safety = parseJSON(checklist.safety_items);
  const safetyItems = [
    { label: 'Cinto de Segurança', data: safety.seatbelt },
    { label: 'Extintor', data: safety.extinguisher },
    { label: 'Triângulo', data: safety.triangle },
    { label: 'Macaco', data: safety.jack },
  ];

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  safetyItems.forEach(item => {
    const status = item.data?.ok ? '✓ OK' : item.data?.problems ? '✗ Com Problemas' : '- Não Verificado';
    pdf.text(`${item.label}: ${status}`, margin + 3, yPosition);
    yPosition += 5;
  });
  yPosition += 5;

  // Motor e Mecânica
  checkPageBreak(35);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('MOTOR E MECÂNICA', margin, yPosition);
  yPosition += 6;

  const motor = parseJSON(checklist.motor_items);
  const motorItems = [
    { label: 'Óleo', data: motor.oil },
    { label: 'Freios', data: motor.brakes },
    { label: 'Bateria', data: motor.battery },
    { label: 'Radiador', data: motor.radiator },
  ];

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  motorItems.forEach(item => {
    const status = item.data?.ok ? '✓ OK' : item.data?.problems ? '✗ Com Problemas' : '- Não Verificado';
    pdf.text(`${item.label}: ${status}`, margin + 3, yPosition);
    yPosition += 5;
  });
  yPosition += 5;

  // Avarias Identificadas
  if (damageMarks.length > 0) {
    checkPageBreak(30);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('AVARIAS IDENTIFICADAS', margin, yPosition);
    yPosition += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);

    damageMarks.forEach((mark, index) => {
      checkPageBreak(15);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Avaria #${index + 1}`, margin + 3, yPosition);
      yPosition += 5;
      
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Localização: ${mark.vehicle_side}`, margin + 6, yPosition);
      yPosition += 5;
      pdf.text(`Posição: X=${mark.x_position.toFixed(1)}%, Y=${mark.y_position.toFixed(1)}%`, margin + 6, yPosition);
      yPosition += 5;
      
      if (mark.observation) {
        yPosition = addWrappedText(`Observação: ${mark.observation}`, margin + 6, yPosition, pageWidth - (2 * margin) - 6, 5);
        yPosition += 3;
      }
      
      if (mark.photos && mark.photos.length > 0) {
        pdf.text(`Fotos anexadas: ${mark.photos.length}`, margin + 6, yPosition);
        yPosition += 5;
      }
      
      yPosition += 3;
    });
  }

  // Observações Finais
  if (checklist.observations && checklist.observations.trim()) {
    checkPageBreak(25);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('OBSERVAÇÕES FINAIS', margin, yPosition);
    yPosition += 6;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    yPosition = addWrappedText(checklist.observations, margin + 3, yPosition, pageWidth - (2 * margin) - 3, 5);
    yPosition += 10;
  }

  // Footer note
  checkPageBreak(20);
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(100, 100, 100);
  const footerNote = 'Este documento registra o estado do veículo no momento da vistoria. As condições aqui descritas servem como referência e registro operacional.';
  yPosition = addWrappedText(footerNote, margin, yPosition, pageWidth - (2 * margin), 4);

  // Save PDF
  const filename = `Checklist_Frota_${checklist.vehicle.replace(/\s+/g, '_')}_${isEntrada ? 'Entrada' : 'Saida'}_${new Date(checklist.inspection_date).toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}

// Helper function to load image from URL
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
