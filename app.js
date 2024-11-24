const express = require('express');
const qrcode = require('qrcode');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Configuração do Swagger (opcional)
// Configuração do Swagger
const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'API de Ingressos',
    version: '1.0.0',
    description: 'API para gerar e validar ingressos com QR code.',
  },
  paths: {
    '/gerar_ingresso': {
      post: {
        summary: 'Gera um ingresso com QR code.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  nome: { type: 'string' },
                  evento: { type: 'string' },
                  data: { type: 'string' },
                  hora: { type: 'string' },
                  local: { type: 'string' },
                },
                required: ['nome', 'evento', 'data', 'hora', 'local'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'QR code gerado com sucesso.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    qrCodeUrl: { type: 'string' },
                  },
                },
              },
            },
          },
          '500': {
            description: 'Erro ao gerar QR code.',
          },
        },
      },
    },
    '/validar_ingresso': {
      post: {
        summary: 'Valida um ingresso com QR code.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  qrCodeData: { type: 'string' },
                },
                required: ['qrCodeData'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Ingresso válido.',
          },
          '400': {
            description: 'Ingresso inválido.',
          },
          '500': {
            description: 'Erro ao validar ingresso.',
          },
        },
      },
    },
  },
};
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Função para gerar QR code
function gerarQrCode(dados) {
  return new Promise((resolve, reject) => {
    qrcode.toDataURL(dados, {
      version: 1,
      errorCorrectionLevel: 'L',
      width: 200, // Ajuste o tamanho conforme necessário
      margin: 4,
    }, (err, url) => {
      if (err) {
        reject(err);
      } else {
        resolve(url);
      }
    });
  });
}

// Função para gerar ingresso
app.post('/gerar_ingresso', async (req, res) => {
  try {
    const { nome, evento, data, hora, local } = req.body;

    // Gerar dados do QR code
    const dadosQr = `Nome: ${nome}\nEvento: ${evento}\nData: ${data}\nHora: ${hora}\nLocal: ${local}`;
    const qrCodeUrl = await gerarQrCode(dadosQr);

    // Retornar imagem do QR code como JSON
    res.json({ qrCodeUrl });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao gerar ingresso.');
  }
});

// Função para validar ingresso (ainda precisa ser implementada)
app.post('/validar_ingresso', (req, res) => {
  // Implementar lógica de validação do QR code aqui
  // ...
  res.json({ status: 'valido' });
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});