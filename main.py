from flask import Flask, request, jsonify, send_file
import qrcode
import io
from flasgger import Swagger
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
swagger = Swagger(app)  # Inicializa o Swagger

# Função para gerar QR code
def gerar_qrcode(dados):
  qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_L,
    box_size=10,
    border=4,
  )
  qr.add_data(dados)
  qr.make(fit=True)
  img = qr.make_image(fill_color="black", back_color="white")
  return img

# Função para gerar ingresso
@app.route('/gerar_ingresso', methods=['POST'])
def gerar_ingresso():
  """
  Gera um ingresso com QR code.
  ---
  parameters:
    - in: body
      name: dados
      schema:
        type: object
        properties:
          nome:
            type: string
          evento:
            type: string
          data:
            type: string
          hora:
            type: string
          local:
            type: string
        required:
          - nome
          - evento
          - data
          - hora
          - local
  responses:
    200:
      description: Imagem do QR code gerado.
      content:
        image/png:
          schema:
            type: string
            format: binary
  """
  dados = request.get_json()
  nome = dados.get('nome')
  evento = dados.get('evento')
  data = dados.get('data')
  hora = dados.get('hora')
  local = dados.get('local')

  # Gerar dados do QR code
  dados_qr = f"Nome: {nome}\nEvento: {evento}\nData: {data}\nHora: {hora}\nLocal: {local}"
  img_qr = gerar_qrcode(dados_qr)

  # Salvar QR code em arquivo temporário
  temp_qr = io.BytesIO()
  img_qr.save(temp_qr, format="PNG")
  temp_qr.seek(0)

  # Retornar imagem do QR code
  return send_file(temp_qr, mimetype='image/png')

# Função para validar ingresso (ainda precisa ser implementada)
@app.route('/validar_ingresso', methods=['POST'])
def validar_ingresso():
  """
  Valida um ingresso com QR code.
  ---
  parameters:
    - in: formData
      name: qrcode
      type: file
      required: true
  responses:
    200:
      description: Status da validação.
      content:
        application/json:
          schema:
            type: object
            properties:
              status:
                type: string
  """
  arquivo = request.files['qrcode']
  # Implementar lógica de validação do QR code aqui
  # ...
  return jsonify({'status': 'valido'})

if __name__ == '__main__':
  app.run(debug=True)