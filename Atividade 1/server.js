const express = require("express");
const app = express();
const axios = require("axios");

var bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true
  })
);

// make all the files in 'public' available
// https://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

// https://expressjs.com/en/starter/basic-routing.html
app.get("/", (request, response) => {
  response.sendFile(__dirname + "/views/index.html");
});

const OpenWeatherMapHelper = require('openweathermap-node');

const helper = new OpenWeatherMapHelper(
  {
    APPID: "bd959aa7d13f3da2666f1a519c882bec",
    units: "metric"
  });

var buscaCep = require("busca-cep");

app.post("/webhook", (request, response) => {
  var intentName = request.body.queryResult.intent.displayName;

//------------------------------- Intent de abertura de chamado ---------------------------------------

  if (intentName == "EscolhaNovoAtendimento") {
    var cep = request.body.queryResult.parameters["cep"];

    buscaCep(cep, { sync: false, timeout: 1000 }).then(endereco => {
      var nome = request.body.queryResult.parameters["nome"];
      var cpf = request.body.queryResult.parameters["cpf"];
      var produto = request.body.queryResult.parameters["produto"];
      var marca = request.body.queryResult.parameters["marca"];
      
      //Criar o número do pedido
      var data = new Date();
      var data2 = Date.now();

      var cliente_endereco =
        endereco.logradouro +
        ", " +
        endereco.bairro +
        ", " +
        endereco.localidade +
        " - " +
        endereco.uf +
        ", CEP: " +
        endereco.cep;
      
      const dados = [
        {
          Pedido:data2,
          Nome: nome.name,
          Status: "A começar",
          CPF: cpf,
          Produto: produto,
          Marca: marca,
          Endereco: cliente_endereco
          
          
        },
      ];

      axios.post("https://sheetdb.io/api/v1/txtach71yczia", dados);
      
      response.json({
        fulfillmentText:
          "Pedido cadastrado com sucesso... " +
          "Nome: "+ nome.name + " | " +
          "CPF: " + cpf + " | " +
          "Produto: " + produto + " | " +
          "Marca: " + marca + " | " +
          "Endereço: " + cliente_endereco + ". " +
          "Podemos te ajudar com mais alguma coisa?"
      });
    });
  }
  
//------------------------------- Intent Status/Acompanhar Pedido ---------------------------------------
  
  if (intentName == "Acompanhar") {
    var cpf_in = request.body.queryResult.parameters["cpf"];

    return axios
      .get("https://sheetdb.io/api/v1/txtach71yczia/search?CPF=" + cpf_in)
      .then((res) => {
        if (res.data.length === 0)
          return response.json({
            fulfillmentText: "CPF " + cpf_in + " não encontrado.",
          });

        res.data.map((person) => {
          if (person.CPF === cpf_in)
            response.json({
              fulfillmentText:
                "Consulta realizada com sucesso!! " +
                "Cliente: " + person.Nome + " | " +
                "Marca: " + person.Marca + " | " +
                "Status: " + person.Status + ". " + 
                "Podemos te ajudar com mais alguma coisa?"
            });
        });
      });
  }
  
//------------------------------- API Temperatura ---------------------------------------
  
   if (intentName == "temperatura") {
    var cidade = request.body.queryResult.parameters["cidade"];
    
    helper.getCurrentWeatherByCityName("" + cidade, (err,currentWeather) => {
      if (err) {
        console.log(err);
        
        response.json({"fulfillmentText": "Cidade ''" + cidade + " '' nao encontrada"});
      }
      else {
        console.log(currentWeather);
        
        var temperaturaAtual = currentWeather.main.temp;
        var temperaturaMaxima = parseInt(currentWeather.main.temp_max);
        var temperaturaMinima = parseInt(currentWeather.main.temp_min);
        
        response.json({"fulfillmentText":
                      "Cidade: " + currentWeather.name + "\n" +
                      "Temperatura Atual: " + temperaturaAtual + "º" + "\n" +
                      "Temperatura Maxima: " + temperaturaMaxima + "º" + "\n" +
                      "Temperatura Minima: " + temperaturaMinima + "º" + "\n"
        });
      }
    })
  }
});

// listen for requests :)
const listener = app.listen(process.env.PORT, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
