-- Banco de dados do Hospital John Knox (MySQL)


-- Cria o banco
CREATE DATABASE IF NOT EXISTS hospital_john_knox
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE hospital_john_knox;


-- Pessoas
CREATE TABLE IF NOT EXISTS pessoas (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nome             VARCHAR(150)  NOT NULL,
  nascimento       DATE          NOT NULL,
  data_criacao     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_modificacao DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id)
) ENGINE = InnoDB;


-- Usuários (cada um pertence a uma pessoa)
CREATE TABLE IF NOT EXISTS usuarios (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  pessoa_id        INT UNSIGNED  NOT NULL,
  login            VARCHAR(50)   NOT NULL,
  senha            VARCHAR(255)  NOT NULL,                 -- criptografada
  tipo_usuario     ENUM('admin', 'medico') NOT NULL,
  data_criacao     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_modificacao DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uk_usuarios_login (login),
  UNIQUE KEY uk_usuarios_pessoa (pessoa_id),

  -- Se a pessoa for excluída, o usuário também é
  CONSTRAINT fk_usuarios_pessoa
    FOREIGN KEY (pessoa_id) REFERENCES pessoas (id)
    ON DELETE CASCADE
) ENGINE = InnoDB;


-- Pacientes (cada um é uma pessoa)
CREATE TABLE IF NOT EXISTS pacientes (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  pessoa_id        INT UNSIGNED  NOT NULL,
  cpf              CHAR(11)      NOT NULL,                 -- só números
  telefone         VARCHAR(11)   NOT NULL,                 -- só números, com DDD
  convenio         VARCHAR(100)  NOT NULL,
  data_criacao     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_modificacao DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uk_pacientes_cpf (cpf),
  UNIQUE KEY uk_pacientes_pessoa (pessoa_id),

  -- Se a pessoa for excluída, o paciente também é
  CONSTRAINT fk_pacientes_pessoa
    FOREIGN KEY (pessoa_id) REFERENCES pessoas (id)
    ON DELETE CASCADE
) ENGINE = InnoDB;


-- Agendamentos (consulta entre um paciente e um médico)
CREATE TABLE IF NOT EXISTS agendamentos (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  paciente_id      INT UNSIGNED  NOT NULL,
  medico_id        INT UNSIGNED  NOT NULL,                 -- usuário do tipo medico
  data_hora        DATETIME      NOT NULL,
  status           ENUM('agendado', 'realizado', 'cancelado') NOT NULL DEFAULT 'agendado',
  data_criacao     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  data_modificacao DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),

  -- Se o paciente ou o médico for excluído, os agendamentos dele também são
  CONSTRAINT fk_agendamentos_paciente
    FOREIGN KEY (paciente_id) REFERENCES pacientes (id)
    ON DELETE CASCADE,
  CONSTRAINT fk_agendamentos_medico
    FOREIGN KEY (medico_id) REFERENCES usuarios (id)
    ON DELETE CASCADE
) ENGINE = InnoDB;
