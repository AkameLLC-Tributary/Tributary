# Basic Design Document
# Tributary - Solana Reward Distribution System

**Last Updated**: 2025-01-18
**Updated By**: akameGusya

## Overview
This document defines the fundamental design philosophy and design decision rationale for the TypeScript/Node.js implementation of the Tributary system. It describes the architectural design intent, relationships between components, and overall system design principles, providing design guidelines for the implementation phase.

## Design Approach
This design document systematically organizes the system architecture design intent, rationale for technology choices, and requirements to be considered. It clearly states the constraint conditions, quality requirements, and future prospects that form the background of design decisions, establishing consistent decision criteria for implementation and maintenance.

## 1. Architecture Design

### 1.1 Design Philosophy and Basic Principles

#### 1.1.1 Adoption of Layered Architecture
A 4-layer layered architecture (Presentation, Application, Service, Infrastructure) is adopted as the basic structure.

**Adoption Rationale**:
- **Clear Responsibility Definition**: Clearly define the responsibility scope of each layer and achieve localization of change impact
- **Testing Strategy**: Improve efficiency of unit and integration testing through layer independence
- **Technology Evolution Response**: Ensure resistance to changes in external technologies (blockchain, UI technologies, etc.)
- **Development Productivity**: Reduce development lead time through parallel development by layer

#### 1.1.2 Adoption of Dependency Injection Pattern
Dependency injection through constructor injection is applied to all components.

**Adoption Rationale**:
- **Loose Coupling Realization**: Minimize impact when implementation changes through interface-based dependencies
- **Test Quality Improvement**: Achieve comprehensive unit testing through mock object injection
- **Unified Configuration Management**: Centralize dependency resolution at application startup to improve maintainability

### 1.2 Design Decisions for Technology Choices

#### 1.2.1 Choice of TypeScript/Node.js Technology Stack
TypeScript/Node.js is adopted as the primary development language.

**Selection Rationale**:
- **Type Safety Assurance**: Advance detection of runtime errors through static type checking
- **Development Efficiency Maximization**: Utilization of rich library ecosystem and mature development toolchain
- **Solana Integration Optimization**: Reduce development risk through natural integration with official SDK (@solana/web3.js)
- **Technology Stack Unification**: Common technology foundation with future frontend development

#### 1.2.2 Adoption of CLI-Driven Approach
Command-line interface is positioned as the primary development target.

**Adoption Rationale**:
- **Operational Automation Adaptation**: Easy integration with CI/CD pipelines and operational scripts
- **Development Speed Optimization**: Reduced lead time to feature delivery compared to GUI development
- **Operation Reproducibility**: Ensure standardization and re-executability of processes through scripting
- **Problem-Solving Efficiency**: Accelerate failure investigation and recovery work through command-line operations

#### 1.2.3 Dependency Library Version Selection Policy

**Version Selection Criteria**:
To ensure system stability and maintainability, dependency library versions are selected based on the following criteria.

**Major Version Selection**:
- **Stability Focus**: Select versions that have been released for 6+ months and have resolved critical known issues
- **LTS Priority**: When Long Term Support versions are available, prioritize LTS versions
- **Security Response**: Select versions with the latest security updates applied

**Solana-Related Libraries**:
- **@solana/web3.js**: Adopt the latest stable version of the official Solana library
- **@solana/spl-token**: Adopt the stable version of the standard library for SPL token operations
- **Compatibility Verification**: Verify version compatibility between libraries in advance and adopt tested combinations

**Development Toolchain**:
- **TypeScript**: Adopt the latest stable version and implement gradual introduction of new features
- **Node.js**: Base on current LTS version and unify execution environment
- **Test Framework**: Adopt stable Jest version and utilize extensive community support

## 2. Component Design Philosophy

### 2.1 Wallet Collector Design Strategy

#### 2.1.1 Component Design Purpose
Efficiently collect token holder information on the Solana blockchain and generate target lists for distribution processing.

**Design Principles**:
- **Single Responsibility Enforcement**: Specialize in wallet information collection function and achieve separation of responsibilities from distribution logic
- **Performance Requirement Fulfillment**: Scalable algorithm design to handle large-scale dataset processing
- **Resource Optimization**: System resource efficiency through elimination of duplicate processing and cache mechanisms

#### 2.1.2 Processing Method Design
**Adoption of Batch Processing Method**:
To achieve practical processing time for large-scale wallet processing (1000+ cases), batch-based parallel processing is adopted. This realizes load distribution to external RPC endpoints and optimization of overall processing time.

**Staged Filtering Method**:
By excluding elements that do not meet conditions in the early stages of data processing, we aim to reduce memory usage and improve processing speed in subsequent processing.

### 2.2 Distribution Engine Design Strategy

#### 2.2.1 Component Design Purpose
The purpose is to execute fair and accurate token distribution processing and ensure processing reliability in large-scale distribution.

**Design Requirements**:
- **Processing Completeness**: Implementation of state management and recovery functions for partial failures
- **Audit Response**: Ensure complete recording and traceability of all distribution processing
- **Processing Scale**: Realization of efficient distribution processing to 1000+ recipients

#### 2.2.2 Distribution Algorithm Design
**Adoption of Proportional Distribution Method**:
To guarantee mathematical fairness, implement distribution amount calculation in complete proportion to base token holdings. Avoid floating-point arithmetic precision issues and achieve strict control of total distribution amount through integer-based calculations.

**Batch Execution Architecture**:
Through batch processing utilizing Solana blockchain's high-throughput characteristics, prevent the impact of individual transaction failures on the whole. Simultaneously provide real-time monitoring of processing progress.

### 2.3 Token Service Abstraction Strategy

#### 2.3.1 Abstraction Design Intent
**Design Purpose**: Hide the technical complexity of Solana blockchain from the application layer and provide a simple and consistent API.

**Abstraction Level Design Decision**:
- **Appropriate Abstraction Level**: Do not over-abstract, design that utilizes Solana-specific features
- **Type Safety**: Prevent compile-time errors using TypeScript's type system
- **Unified Error Handling**: Normalization of blockchain-specific errors

#### 2.3.2 Network Management Design
**Multi-Network Support**:
- **Development Flow Support**: Gradual migration from devnet → testnet → mainnet
- **Centralized Configuration**: Simplification of network switching
- **Environment Separation**: Guarantee independent operation in each environment

## 3. Data Design Philosophy

### 3.1 Data Model Design Principles
**Design Principles**:
- **Completeness**: Comprehensive information recording that meets audit requirements
- **Normalization**: Data consistency and elimination of redundancy
- **Extensibility**: Structure capable of responding to future feature additions

### 3.2 Persistence Strategy
**Reasons for Choosing File-Based Persistence**:
- **Simplicity**: Avoidance of external database dependencies
- **Portability**: Environment-independent executability
- **Security**: Data protection through local control

## 4. Security Design Principles

### 4.1 Private Key Management Strategy
**Design Principles**:
- **Minimum Privilege**: Execution with minimum necessary privileges
- **Encrypted Storage**: Private key protection through industry-standard encryption
- **Memory Management**: Immediate memory clearing after use

### 4.2 Audit Trail Design
**Audit Requirement Response**:
- **Complete Log Recording**: Recording of all important operations
- **Tampering Verification**: Log integrity verification function
- **Long-term Storage**: Setting retention periods that meet legal requirements

## 5. Performance Design Strategy

### 5.1 Scalability Considerations
**Large-Scale Distribution Response**:
- **Parallel Processing**: Time reduction through parallel execution of independent processing
- **Memory Efficiency**: Large data handling through streaming processing
- **Cache Strategy**: Efficient management of frequently accessed data

### 5.2 Utilizing Solana Network Characteristics
**High Throughput Utilization**:
- **Batch Optimization**: Effective utilization of Solana's 65,000 TPS capability
- **Low Latency**: Achievement of processing time under 400ms
- **Cost Efficiency**: Minimization of transaction costs

## 6. Error Handling and Resilience

### 6.1 Failure Response Design Philosophy
**Resilience Strategy**:
- **Partial Failure Response**: Staged processing to avoid total shutdown
- **Automatic Recovery**: Automatic recovery function from temporary failures
- **Detailed Diagnosis**: Automation of problem identification and countermeasure proposals

### 6.2 Usability and Error Notification
**Error Experience Design**:
- **Clear Messages**: Explanations understandable to non-technical users
- **Solution Presentation**: Presentation of specific solutions when errors occur
- **Staged Details**: Gradual information provision from basic to detailed

## 7. Extensibility and Future Prospects

### 7.1 Design for Future Functions
**Extension Points**:
- **Multi-Chain Support**: Preparation for other chain support at architecture level
- **API Development**: Additional support for REST API endpoints
- **WebUI Integration**: Integration design with web dashboard

### 7.2 Consideration for Community Development
**Open Source Strategy**:
- **Contribution Ease**: Reduce participation barriers through clear responsibility separation
- **Documentation Enhancement**: Promote understanding through documentation of design intent
- **Test Ease**: Efficiency of regression testing when adding new features

## 8. Operational Design Considerations

### 8.1 Monitoring and Alerts
**Operational Monitoring Strategy**:
- **Health Monitoring**: Continuous monitoring of system operation status
- **Performance Monitoring**: Detection of processing performance degradation
- **Security Monitoring**: Detection of abnormal access patterns

### 8.2 Maintainability Design
**Maintenance Efficiency Improvement**:
- **Configuration Externalization**: Flexibility through runtime configuration changes
- **Structured Logging**: Machine-processable log format
- **Debug Support**: Provision of detailed information to support problem identification