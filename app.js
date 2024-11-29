const express = require('express');
const qrcode = require('qrcode');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const mongoose = require('mongoose');
const {v4} = require('uuid')

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

// Conexão com o MongoDB
const mongoURI = `mongodb://mongo:iRyYMmxslKQLNRszYTixmowIkkUEmFgX@junction.proxy.rlwy.net:30044`;
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Conectado ao MongoDB'))
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Schema do MongoDB para os QR Codes
const qrCodeSchema = new mongoose.Schema({
  cpf: { type: String, required: true, unique: false },
  uuid: {type: String, required: false, unique: true},
  qrCodeData: { type: String, required: true, unique: true },
  image: { type: String, require: false, unique: false}
});

const QRCode = mongoose.model('pass', qrCodeSchema);

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
                  cpf: { type: 'string' },
                },
                required: ['nome', 'evento', 'data', 'hora', 'local', 'cpf'],
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
                  cpf: { type: 'string' },
                },
                required: ['cpf'],
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
    // ---->>>> AQUI ESTÁ A PARTE DO GET <<<<----
    '/ingressos/{cpf}': { 
      get: {
        summary: 'Consulta ingressos por CPF',
        parameters: [
          {
            in: 'path',
            name: 'cpf',
            schema: {
              type: 'string',
            },
            required: true,
            description: 'CPF do usuário',
          },
        ],
        responses: {
          '200': {
            description: 'Ingressos encontrados',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      Nome: { type: 'string' },
                      Evento: { type: 'string' },
                      Data: { type: 'string' },
                      Hora: { type: 'string' },
                      Local: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
          '404': {
            description: 'Nenhum ingresso encontrado',
          },
          '500': {
            description: 'Erro ao consultar ingressos',
          },
        },
      },
    },
  },
};
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Função para gerar QR code (modificada para salvar no banco)
async function gerarQrCode(dados, cpf, uuid, object) {
  return new Promise((resolve, reject) => {
    qrcode.toDataURL(JSON.stringify(object), {
      version: 5,
      errorCorrectionLevel: 'L',
      width: 100,
      margin: 4,
    }, async (err, url) => {
      if (err) {
        reject(err);
      } else {
        try {
          // Salva o QR code no banco de dados
          const novoQRCode = new QRCode({ cpf, uuid, qrCodeData: dados, image: url  });
          await novoQRCode.save();
          resolve(url);
        } catch (error) {
          reject(error);
        }
      }
    });
  });
}

// Função para gerar ingresso (modificada para incluir CPF)
app.post('/gerar_ingresso', async (req, res) => {
  try {
    const { nome, evento, data, hora, local, cpf } = req.body;
    const uuidQr = v4()
    // Gerar dados do QR code
    const dadosQr = `Nome: ${nome}\nEvento: ${evento}\nData: ${data}\nHora: ${hora}\nLocal: ${local}`;
    const qrCodeUrl = await gerarQrCode(dadosQr, cpf, uuidQr, {cpf, uuidQr});

    // Retornar imagem do QR code como JSON
    res.json({ qrCodeUrl });
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao gerar ingresso.');
  }
});

// Função para validar ingresso (busca pelo CPF)
app.post('/validar_ingresso', async (req, res) => {
  try {
    const { cpf, uuidQr } = req.body;
    const uuid = uuidQr
    // Encontra o QR code no banco de dados pelo CPF
    const qrCode = await QRCode.findOne({ cpf, uuid });

    if (qrCode) {
      res.json({ status: 'válido', qrCodeData: qrCode.image });
    } else {
      res.status(400).json({ status: 'inválido', message: 'CPF não encontrado' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao validar ingresso.');
  }
});

// Endpoint para consultar ingressos por CPF
app.get('/ingressos/:cpf', async (req, res) => {
  try {
    const cpf = req.params.cpf;

    // Encontra os QR codes no banco de dados pelo CPF
    const qrCodes = await QRCode.find({ cpf });

    if (qrCodes.length > 0) {
      // Formata a resposta para incluir apenas os dados relevantes
      const ingressos = qrCodes.map(qrCode => {
        const dados = qrCode.qrCodeData.split('\n');
        const image = qrCode.image;
        const ingresso = {};
        dados.forEach(linha => {
          const [chave, valor] = linha.split(': ');
          ingresso[chave.trim()] = valor.trim();
          ingresso.image = image
        });
        return ingresso;
      });
      res.json(ingressos);
    } else {
      res.status(404).json({ message: 'Nenhum ingresso encontrado para este CPF' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao consultar ingressos.');
  }
});




app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});