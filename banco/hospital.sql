-- ==========================================================
-- HOSPITAL JOHN KNOX — BANCO DE DADOS (MySQL)
-- Script de criação do banco e das tabelas.
-- ==========================================================


-- Cria o banco, caso ainda não exista.
CREATE DATABASE IF NOT EXISTS hospital_john_knox
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE hospital_john_knox;


-- ----------------------------------------------------------
-- TABELA: pessoas
-- Dados básicos de cada pessoa cadastrada no sistema.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS pessoas (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,  -- identificador único, gerado automaticamente
  nome             VARCHAR(150)  NOT NULL,                 -- nome completo
  nascimento       DATE          NOT NULL,                 -- data de nascimento (AAAA-MM-DD)
  data_criacao     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,                              -- preenchida ao cadastrar
  data_modificacao DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- atualizada a cada alteração

  PRIMARY KEY (id)
) ENGINE = InnoDB;


-- ----------------------------------------------------------
-- TABELA: usuarios
-- Acesso ao sistema. Cada usuário pertence a uma pessoa.
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id               INT UNSIGNED  NOT NULL AUTO_INCREMENT,  -- identificador único, gerado automaticamente
  pessoa_id        INT UNSIGNED  NOT NULL,                 -- pessoa dona deste usuário (tabela pessoas)
  login            VARCHAR(50)   NOT NULL,                 -- nome de acesso, não pode se repetir
  senha            VARCHAR(255)  NOT NULL,                 -- senha criptografada (nunca em texto puro)
  tipo_usuario     ENUM('admin', 'medico') NOT NULL,       -- perfil de acesso
  data_criacao     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,                              -- preenchida ao cadastrar
  data_modificacao DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,  -- atualizada a cada alteração

  PRIMARY KEY (id),
  UNIQUE KEY uk_usuarios_login (login),          -- dois usuários não podem ter o mesmo login
  UNIQUE KEY uk_usuarios_pessoa (pessoa_id),     -- cada pessoa tem no máximo um usuário

  -- Liga o usuário à pessoa. Se a pessoa for excluída, o usuário dela também é.
  CONSTRAINT fk_usuarios_pessoa
    FOREIGN KEY (pessoa_id) REFERENCES pessoas (id)
    ON DELETE CASCADE
) ENGINE = InnoDB;
