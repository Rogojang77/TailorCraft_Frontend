import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

interface OrderData {
  id: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  orderDate: string;
  pickupDate: string;
  total: number;
  advance: number;
  paymentMethod: string;
  jacket?: {
    chest: string;
    waist: string;
    hips: string;
    frontLength: string;
    backLength: string;
    shoulderToShoulder: string;
    sleeveLength: string;
    backWidth: string;
    lapelType: string;
    model: string;
    size: string;
    materialCode: string;
    observations: string;
  };
  vest?: {
    chest: string;
    waist: string;
    hips: string;
    frontLength: string;
    backLength: string;
    model: string;
    lining: string;
    buttons: string;
    materialCode: string;
    observations: string;
  };
  pants?: {
    size: string;
    model: string;
    waist: string;
    hips: string;
    upperLeg: string;
    knee: string;
    hem: string;
    frontCircumference: string;
    backCircumference: string;
    interiorLength: string;
    exteriorLength: string;
    materialCode: string;
    observations: string;
  };
}

interface CompanyData {
  name: string;
  owner: string;
  phone: string;
  email: string;
  address: string;
  logo?: string;
}

const generatePDFHTML = (orderData: OrderData, companyData: CompanyData): string => {
  const remaining = orderData.total - orderData.advance;
  
  return `
    <!DOCTYPE html>
    <html lang="ro">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Fișă de Comandă ${orderData.id} - ${orderData.clientName}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          line-height: 1.4;
          color: #1F2937;
          background: #FFFFFF;
          font-size: 13px;
        }
        
        .document {
          max-width: 210mm;
          margin: 0 auto;
          padding: 15mm;
          background: white;
          min-height: 297mm;
        }
        
        .header {
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 3px solid #D4AF37;
        }
        
        .company-name {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 6px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        
        .company-details {
          font-size: 11px;
          color: #6B7280;
          line-height: 1.6;
        }
        
        .document-title {
          text-align: center;
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 6px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
        }
        
        .document-subtitle {
          text-align: center;
          font-size: 12px;
          color: #6B7280;
          margin-bottom: 20px;
          font-weight: 500;
        }
        
        .section {
          margin-bottom: 18px;
        }
        
        .section-title {
          font-size: 15px;
          font-weight: 700;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          border-bottom: 2px solid #E5E7EB;
          padding-bottom: 6px;
        }
        
        .info-item {
          margin-bottom: 4px;
          font-size: 12px;
          line-height: 1.4;
        }
        
        .info-label {
          font-weight: 500;
          color: #6B7280;
          display: inline-block;
          min-width: 110px;
        }
        
        .info-value {
          color: #1F2937;
        }
        
        .measurement-item {
          margin-bottom: 3px;
          font-size: 12px;
          line-height: 1.4;
        }
        
        .measurement-label {
          font-weight: 500;
          color: #6B7280;
          display: inline-block;
          min-width: 130px;
        }
        
        .measurement-value {
          color: #1F2937;
        }
        
        .style-item {
          margin-bottom: 3px;
          font-size: 12px;
          line-height: 1.4;
        }
        
        .style-label {
          font-weight: 500;
          color: #6B7280;
          display: inline-block;
          min-width: 110px;
        }
        
        .style-value {
          color: #1F2937;
        }
        
        .observations {
          margin-top: 10px;
          padding: 8px 0;
        }
        
        .observations-title {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        .observations-text {
          font-size: 12px;
          color: #6B7280;
          line-height: 1.5;
        }
        
        .payment-item {
          margin-bottom: 4px;
          font-size: 12px;
          line-height: 1.4;
        }
        
        .payment-label {
          font-weight: 500;
          color: #6B7280;
          display: inline-block;
          min-width: 130px;
        }
        
        .payment-value {
          color: #1F2937;
          font-weight: 600;
        }
        
        .signatures-section {
          margin-top: 35px;
          page-break-inside: avoid;
        }
        
        .signatures-title {
          font-size: 14px;
          font-weight: 700;
          text-align: center;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        
        .signatures-disclaimer {
          font-size: 10px;
          color: #6B7280;
          text-align: center;
          margin-bottom: 25px;
          line-height: 1.5;
          font-style: italic;
        }
        
        .signature-box {
          margin-bottom: 30px;
          text-align: center;
        }
        
        .signature-line {
          height: 50px;
          margin-bottom: 8px;
        }
        
        .signature-label {
          font-size: 11px;
          color: #1F2937;
          font-weight: 600;
        }
        
        .footer {
          margin-top: 30px;
          text-align: center;
          border-top: 1px solid #E5E7EB;
          padding-top: 15px;
        }
        
        .footer-text {
          font-size: 9px;
          color: #9CA3AF;
          line-height: 1.6;
        }
        
        .footer-note {
          font-size: 8px;
          color: #9CA3AF;
          margin-top: 8px;
          line-height: 1.5;
          font-style: italic;
        }
      </style>
    </head>
    <body>
      <div class="document">
        <!-- Header with Company Info -->
        <header class="header">
          <h1 class="company-name">${companyData.name}</h1>
          <div class="company-details">
            Proprietar: ${companyData.owner} | Telefon: ${companyData.phone} | Email: ${companyData.email}<br>
            Adresă: ${companyData.address}
          </div>
        </header>
        
        <!-- Document Title -->
        <h1 class="document-title">Contract de Prestări Servicii</h1>
        <p class="document-subtitle">Document de Comandă Nr. ${orderData.id} | Data Emiterii: ${new Date().toLocaleDateString('ro-RO', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}</p>
        
        <!-- Order Information -->
        <div class="section">
          <h2 class="section-title">Date Beneficiar</h2>
          <div class="info-item">
            <span class="info-label">Nume complet:</span>
            <span class="info-value">${orderData.clientName}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Telefon:</span>
            <span class="info-value">${orderData.clientPhone}</span>
          </div>
          ${orderData.clientEmail ? `
          <div class="info-item">
            <span class="info-label">Adresă email:</span>
            <span class="info-value">${orderData.clientEmail}</span>
          </div>
          ` : ''}
        </div>
        
        <div class="section">
          <h2 class="section-title">Informații Contract</h2>
          <div class="info-item">
            <span class="info-label">Data contractării:</span>
            <span class="info-value">${new Date(orderData.orderDate).toLocaleDateString('ro-RO')}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Data estimată finalizare:</span>
            <span class="info-value">${new Date(orderData.pickupDate).toLocaleDateString('ro-RO')}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Cod referință:</span>
            <span class="info-value">${orderData.id}</span>
          </div>
        </div>
        
        ${orderData.jacket ? `
        <!-- Jacket Measurements -->
        <div class="section">
          <h2 class="section-title">Specificații Tehnice - Sacou</h2>
          <div class="measurement-item">
            <span class="measurement-label">Bust:</span>
            <span class="measurement-value">${orderData.jacket.chest} cm</span>
          </div>
          <div class="measurement-item">
            <span class="measurement-label">Talie:</span>
            <span class="measurement-value">${orderData.jacket.waist} cm</span>
          </div>
          <div class="measurement-item">
            <span class="measurement-label">Șold:</span>
            <span class="measurement-value">${orderData.jacket.hips} cm</span>
          </div>
          <div class="measurement-item">
            <span class="measurement-label">Lungime Față:</span>
            <span class="measurement-value">${orderData.jacket.frontLength} cm</span>
          </div>
          <div class="measurement-item">
            <span class="measurement-label">Lungime Spate:</span>
            <span class="measurement-value">${orderData.jacket.backLength} cm</span>
          </div>
          <div class="measurement-item">
            <span class="measurement-label">Umăr în Umăr:</span>
            <span class="measurement-value">${orderData.jacket.shoulderToShoulder} cm</span>
          </div>
          <div class="measurement-item">
            <span class="measurement-label">Lungime Mânecă:</span>
            <span class="measurement-value">${orderData.jacket.sleeveLength} cm</span>
          </div>
          <div class="measurement-item">
            <span class="measurement-label">Lățime Spate:</span>
            <span class="measurement-value">${orderData.jacket.backWidth} cm</span>
          </div>
          
          <div style="margin-top: 10px;">
            <div class="style-item">
              <span class="style-label">Mărime:</span>
              <span class="style-value">${orderData.jacket.size}</span>
            </div>
            <div class="style-item">
              <span class="style-label">Model:</span>
              <span class="style-value">${orderData.jacket.model}</span>
            </div>
            <div class="style-item">
              <span class="style-label">Tip rever:</span>
              <span class="style-value">${orderData.jacket.lapelType}</span>
            </div>
            <div class="style-item">
              <span class="style-label">Cod material:</span>
              <span class="style-value">${orderData.jacket.materialCode}</span>
            </div>
          </div>
          
          ${orderData.jacket.observations ? `
          <div class="observations">
            <div class="observations-title">Observații și Specificații Suplimentare:</div>
            <div class="observations-text">${orderData.jacket.observations}</div>
          </div>
          ` : ''}
        </div>
        ` : ''}
        
        ${orderData.vest ? `
        <!-- Vest Measurements -->
        <div class="section">
          <h2 class="section-title">Specificații Tehnice - Vestă</h2>
          <div class="measurement-item">
            <span class="measurement-label">Bust:</span>
            <span class="measurement-value">${orderData.vest.chest} cm</span>
          </div>
          <div class="measurement-item">
            <span class="measurement-label">Talie:</span>
            <span class="measurement-value">${orderData.vest.waist} cm</span>
          </div>
          <div class="measurement-item">
            <span class="measurement-label">Șold:</span>
            <span class="measurement-value">${orderData.vest.hips} cm</span>
          </div>
          <div class="measurement-item">
            <span class="measurement-label">Lungime Față:</span>
            <span class="measurement-value">${orderData.vest.frontLength} cm</span>
          </div>
          <div class="measurement-item">
            <span class="measurement-label">Lungime Spate:</span>
            <span class="measurement-value">${orderData.vest.backLength} cm</span>
          </div>
          
          <div style="margin-top: 10px;">
            <div class="style-item">
              <span class="style-label">Model:</span>
              <span class="style-value">${orderData.vest.model}</span>
            </div>
            <div class="style-item">
              <span class="style-label">Căptușeală:</span>
              <span class="style-value">${orderData.vest.lining}</span>
            </div>
            <div class="style-item">
              <span class="style-label">Nasturi:</span>
              <span class="style-value">${orderData.vest.buttons}</span>
            </div>
            <div class="style-item">
              <span class="style-label">Cod material:</span>
              <span class="style-value">${orderData.vest.materialCode}</span>
            </div>
          </div>
          
          ${orderData.vest.observations ? `
          <div class="observations">
            <div class="observations-title">Observații și Specificații Suplimentare:</div>
            <div class="observations-text">${orderData.vest.observations}</div>
          </div>
          ` : ''}
        </div>
        ` : ''}
        
        ${orderData.pants ? `
        <!-- Pants Measurements -->
        <div class="section">
          <h2 class="section-title">Specificații Tehnice - Pantaloni</h2>
          <div class="measurement-item">
            <span class="measurement-label">Mărime:</span>
            <span class="measurement-value">${orderData.pants.size}</span>
          </div>
          <div class="measurement-item">
            <span class="measurement-label">Talie:</span>
            <span class="measurement-value">${orderData.pants.waist} cm</span>
          </div>
          <div class="measurement-item">
            <span class="measurement-label">Șold:</span>
            <span class="measurement-value">${orderData.pants.hips} cm</span>
          </div>
          <div class="measurement-item">
            <span class="measurement-label">Picior Sus:</span>
            <span class="measurement-value">${orderData.pants.upperLeg} cm</span>
          </div>
          <div class="measurement-item">
            <span class="measurement-label">Genunchi:</span>
            <span class="measurement-value">${orderData.pants.knee} cm</span>
          </div>
          <div class="measurement-item">
            <span class="measurement-label">Tiv:</span>
            <span class="measurement-value">${orderData.pants.hem} cm</span>
          </div>
          <div class="measurement-item">
            <span class="measurement-label">Lungime Int.:</span>
            <span class="measurement-value">${orderData.pants.interiorLength} cm</span>
          </div>
          <div class="measurement-item">
            <span class="measurement-label">Lungime Ext.:</span>
            <span class="measurement-value">${orderData.pants.exteriorLength} cm</span>
          </div>
          
          <div style="margin-top: 10px;">
            <div class="style-item">
              <span class="style-label">Model:</span>
              <span class="style-value">${orderData.pants.model}</span>
            </div>
            <div class="style-item">
              <span class="style-label">Cod material:</span>
              <span class="style-value">${orderData.pants.materialCode}</span>
            </div>
          </div>
          
          ${orderData.pants.observations ? `
          <div class="observations">
            <div class="observations-title">Observații și Specificații Suplimentare:</div>
            <div class="observations-text">${orderData.pants.observations}</div>
          </div>
          ` : ''}
        </div>
        ` : ''}
        
        <!-- Payment Information -->
        <div class="section">
          <h2 class="section-title">Condiții Comerciale</h2>
          <div class="payment-item">
            <span class="payment-label">Valoare totală servicii:</span>
            <span class="payment-value">${orderData.total} RON</span>
          </div>
          <div class="payment-item">
            <span class="payment-label">Sumă achitată în avans:</span>
            <span class="payment-value">${orderData.advance} RON</span>
          </div>
          <div class="payment-item">
            <span class="payment-label">Sold de achitat la finalizare:</span>
            <span class="payment-value">${remaining} RON</span>
          </div>
          <div class="payment-item">
            <span class="payment-label">Metodă de plată convenită:</span>
            <span class="payment-value">${orderData.paymentMethod}</span>
          </div>
        </div>
        
        <!-- Signatures -->
        <div class="signatures-section">
          <h3 class="signatures-title">Confirmare și Validare Document</h3>
          <p class="signatures-disclaimer">
            Prin semnarea prezentului document, ambele părți confirmă că au citit, înțeles și acceptat termenii și condițiile stipulate mai sus.
          </p>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Semnătura și Ștampila Prestatorului</div>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <div class="signature-label">Semnătura Beneficiarului</div>
          </div>
        </div>
        
        <!-- Footer -->
        <footer class="footer">
          <p class="footer-text">
            Document emis în data de ${new Date().toLocaleDateString('ro-RO', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          <p class="footer-note">
            Acest document are valoare contractuală. Modificările ulterioare vor fi efectuate doar prin acordul scris al ambelor părți.<br>
            Vă mulțumim pentru încrederea acordată serviciilor noastre.
          </p>
        </footer>
      </div>
    </body>
    </html>
  `;
};

export const generateOrderPDF = async (orderData: OrderData, companyData: CompanyData, useBase64: boolean = false) => {
  try {
    const html = generatePDFHTML(orderData, companyData);
    
    const result = await Print.printToFileAsync({
      html,
      base64: useBase64,
      width: 612,
      height: 792,
      margins: {
        left: 20,
        top: 20,
        right: 20,
        bottom: 20,
      },
    });
    
    // If base64 was requested, return both uri and base64
    if (useBase64 && 'base64' in result && result.base64) {
      return { uri: result.uri, base64: result.base64 };
    }
    
    return { uri: result.uri };
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Nu s-a putut genera PDF-ul. Verificați datele și încercați din nou.');
  }
};

export const shareOrderPDF = async (orderData: OrderData, companyData: CompanyData) => {
  try {
    const result = await generateOrderPDF(orderData, companyData, false);
    const pdfUri = result.uri;
    
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Comandă ${orderData.id} - ${orderData.clientName}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      throw new Error('Partajarea nu este disponibilă pe această platformă');
    }
  } catch (error) {
    console.error('Error sharing PDF:', error);
    throw new Error('Nu s-a putut partaja PDF-ul. Încercați din nou.');
  }
};

export const downloadOrderPDF = async (orderData: OrderData, companyData: CompanyData) => {
  try {
    const fileName = `Comanda_${orderData.id}_${orderData.clientName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    
    // Check if we're on web platform - must have both window and document
    const isWeb = Platform.OS === 'web' && 
                  typeof window !== 'undefined' && 
                  typeof document !== 'undefined' &&
                  typeof document.createElement === 'function';
    
    if (isWeb) {
      try {
        // Generate PDF with base64 for web (if supported)
        let result;
        try {
          result = await generateOrderPDF(orderData, companyData, true);
        } catch (base64Error) {
          // If base64 generation fails, try without base64
          console.warn('Base64 PDF generation failed, trying without base64:', base64Error);
          result = await generateOrderPDF(orderData, companyData, false);
        }
        
        let downloadUrl: string;
        
        if ('base64' in result && result.base64) {
          // Create data URL from base64
          downloadUrl = `data:application/pdf;base64,${result.base64}`;
        } else {
          // Fallback to URI if base64 not available
          const pdfUri = result.uri;
          
          // Check if URI is already a data URL
          if (pdfUri.startsWith('data:')) {
            downloadUrl = pdfUri;
          } else if (pdfUri.startsWith('blob:')) {
            // Use blob URL directly - no need to create a new one
            downloadUrl = pdfUri;
          } else {
            // Try to fetch and convert to data URL using FileReader (avoids createObjectURL)
            try {
              const response = await fetch(pdfUri);
              if (!response.ok) {
                throw new Error(`Failed to fetch PDF: ${response.statusText}`);
              }
              const blob = await response.blob();
              if (!blob || blob.size === 0) {
                throw new Error('Received empty or invalid blob');
              }
              // Convert blob to base64 data URL using FileReader (more reliable than createObjectURL)
              const reader = new FileReader();
              downloadUrl = await new Promise<string>((resolve, reject) => {
                reader.onloadend = () => {
                  if (typeof reader.result === 'string') {
                    resolve(reader.result);
                  } else {
                    reject(new Error('Failed to convert blob to data URL'));
                  }
                };
                reader.onerror = () => {
                  reject(new Error('FileReader error while converting blob'));
                };
                reader.readAsDataURL(blob);
              });
            } catch (fetchError) {
              console.error('Error fetching/converting PDF:', fetchError);
              throw new Error(`Nu s-a putut descărca PDF-ul: ${fetchError instanceof Error ? fetchError.message : 'Eroare necunoscută'}`);
            }
          }
        }
        
        // Create download link with data URL (only if document exists)
        if (typeof document !== 'undefined' && document.createElement) {
          const link = document.createElement('a');
          link.href = downloadUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          throw new Error('Document API not available');
        }
        
        return result.uri;
      } catch (webError) {
        console.error('Web download error:', webError);
        throw webError;
      }
    } else {
      // For native platforms (iOS/Android), use regular URI
      // On native, we can use FileSystem or Sharing for downloads
      const result = await generateOrderPDF(orderData, companyData, false);
      
      // Try to use sharing if available
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: fileName,
          UTI: 'com.adobe.pdf',
        });
      }
      
      return result.uri;
    }
  } catch (error) {
    console.error('Error downloading PDF:', error);
    throw new Error('Nu s-a putut descărca PDF-ul. Încercați din nou.');
  }
};

export const previewOrderPDF = async (orderData: OrderData, companyData: CompanyData) => {
  try {
    const html = generatePDFHTML(orderData, companyData);
    
    // For web platform, open in new window for preview
    if (typeof window !== 'undefined') {
      const newWindow = window.open('', '_blank');
      if (newWindow) {
        newWindow.document.write(html);
        newWindow.document.close();
      }
    }
    
    return html;
  } catch (error) {
    console.error('Error previewing PDF:', error);
    throw new Error('Nu s-a putut previzualiza PDF-ul. Încercați din nou.');
  }
};