library(tidyverse)
library(lubridate)
library(stringr)
library(viridis)
library(colorspace)
library(extrafont)
library(padr)

#extrafont::font_import()
loadfonts()


# importa dados -----------------------------------------------------------

honras <- read.csv2("./R/relatorio_honras_atrasos.csv",
                    skip = 10, stringsAsFactors = FALSE)

names(honras) <- c("Data de Vencimento", "Tipo de Dívida", "Nome do Contrato", 
                   "Credor", "Classificação do Credor", "Mutuário", "Tipo de Mutuário", 
                   "Processo PGFN", "Status", "Data Limite da União", "Data Regularização do Atraso", 
                   "Moeda de Origem", "Total no Vencimento (Moeda de Origem)", "Honra - Principal (Moeda de Origem)", 
                   "Honra - Juros/Encargos (Moeda de Origem)", "Honra - Mora (Moeda de Origem)", 
                   "Honra - Total (Moeda de Origem)", "Honra - Principal (R$)", 
                   "Honra Juros/Encargos (R$)", "Honra - Mora (R$)", "Honra - Total (R$)", 
                   "Ano Regularização", "Mês Regularização", "X24")


# processamento inicial ---------------------------------------------------

honras_simples_pre <- honras %>%
  select(data = `Data de Vencimento`,
         tipo_divida = `Tipo de Dívida`,
         `Credor`,
         tipo_credor = `Classificação do Credor`,
         mutuario = `Mutuário`,
         tipo_mutuario = `Tipo de Mutuário`,
         `Status`,
         valor = `Honra - Total (R$)`) %>%
  as.data.frame() %>%
  mutate(data = dmy(data),
         mes = str_pad(month(data), width = 2, pad = "0"),
         ano = year(data),
         mes_ano = paste0(ano,mes),
         mutuario_cat = case_when(
           mutuario == "Rio de Janeiro" ~ "Estado do Rio de Janeiro",
           mutuario == "Minas Gerais" ~ "Minas Gerais",
           TRUE ~ "Demais entes"),
         #estados = if_else(tipo_mutuario == "Municípios", "Municípios", mutuario),
         valor = as.numeric(
           str_replace(
             str_replace_all(as.character(valor), "\\.", ""), 
             ",", "\\.")))

# consultas on the fly
honras_simples_pre %>% filter(mutuario == "Rio de Janeiro") %>% group_by(mes_ano) %>% count()
honras_simples_pre %>% group_by(mutuario) %>% summarise(v = sum(valor)) %>% arrange(desc(v)) %>%
  ggplot(aes(x = v, y = reorder(mutuario, v))) + geom_col()

top_11_mutuarios <- honras_simples_pre %>% 
  group_by(mutuario) %>% 
  summarise(v = sum(valor)) %>% 
  arrange(desc(v)) %>%
  filter(rank(-v)<=11) %>%
  pull(mutuario)

honras_simples <- honras_simples_pre %>%
  mutate(estados = if_else(mutuario %in% top_11_mutuarios,
                           mutuario,
                           "Demais"))

# contagem e posições
contagem_honras_avancado <- honras_simples %>%
  group_by(Credor) %>%
  mutate(qde_credor = n()) %>%
  ungroup() %>%
  mutate(credor_cat = ifelse(qde_credor < 20, "Demais credores", Credor)) %>%
  #arrange(mes_ano, desc(mutuario_cat)) %>%
  arrange(mes_ano, match(mutuario_cat, c("Estado do Rio de Janeiro", "Minas Gerais", "Demais entes"))) %>%
  mutate(data_mes = as.Date(paste(str_sub(mes_ano, 1, 4),
                                  str_sub(mes_ano, 5, 6),
                                  "01", sep = "-"))) %>%
  group_by(data_mes) %>%
  mutate(pos = row_number()) %>%
  ungroup()



honras_det <- contagem_honras_avancado

honras_det %>% group_by(estados) %>% summarise(soma = sum(valor), qde = n()) %>% arrange(desc(soma))

sum(honras_det$valor[honras_det$mutuario=="Rio de Janeiro"]) / sum(honras_det$valor)
## para streamgraph

honras_agg <- contagem_honras_avancado %>%
  group_by(data_mes, mutuario_cat) %>%
  summarise(valor_mes = sum(valor),
            qde = n()) %>%
  ungroup() %>%
  gather(valor_mes, qde, key = "tipo_valor", value = "valor") %>% #(1)
  spread(mutuario_cat, value = valor) %>%
  pad(by = "data_mes", interval = "month") %>%
  gather(-c(data_mes, tipo_valor), key = mutuario_cat, value = valor) %>%
  spread(tipo_valor, value = valor) %>%
  replace_na(list(qde = 0, valor_mes = 0)) %>%
  group_by(mutuario_cat) %>%
  mutate(valor_acum = cumsum(valor_mes))

#(1): faço essa combinação de gathers e spread para "preencher" os valores
#     de todas as categorias para todos os meses.



## exporta

write.csv(honras_det, file = "webpage/dados/dados_honras_det.csv", fileEncoding = "UTF-8")
write.csv(honras_agg, file = "webpage/dados/dados_honras_agg.csv", fileEncoding = "UTF-8")

#verificacoes

sum(honras_det$valor[honras_det$mutuario=="Rio de Janeiro"]) / sum(honras_det$valor)
length(unique(honras_det$mutuario))

ggplot(honras_det, aes(y = pos, x = data_mes)) + geom_point()

honras_det %>% filter(ano == 2020) %>% group_by(Credor) %>% summarise(sum(valor)) %>% arrange(desc(`sum(valor)`))

View(honras_det %>% count(data_mes))


# prototipos das viz ------------------------------------------------------

plota_sumario <- function(variavel) {
  
  quo_var <- enquo(variavel)

  ggplot(honras_simples_pre %>%
           group_by(!! quo_var) %>%
           summarise(valor = sum(valor)),
         aes(y = reorder(!! quo_var, valor), x = valor)) +
    geom_col()
}


plota_sumario(mutuario)
