# **语义模块：SenseEntity** 

**SenseEntity** 是语义模块 \[08\] 的核心，被定义为全球语言注册表中代表独立“概念”的主对象。它不依赖于任何特定语言，而是作为一种语义“灵魂”存在，通过一系列结构化数据来定义一个意思的本质、逻辑关系、表现形式以及在不同语言中的映射。

# **全面介绍：**

### **1\. 核心身份与语义 DNA (Identity & Fingerprint)**

每个 SenseEntity 都拥有唯一的身份标识，确保其在数据库中的不可替代性：

* **唯一标识符 (uid)**：一个永久且唯一的 UUID。  
* **语义指纹 (Fingerprint)**：被视为该语义的“DNA”。它由 **6 个精确的英语单词**（Anchor Words）组成，用于在数据库中进行模糊匹配和定位。这些词被分为三个权重层级（Tier 1: 核心, Tier 2: 强相关, Tier 3: 相关），以定义概念的最本质特征。  
* **频率权重 (Frequency)**：1-100 的数值。代表该“意思”在人类交流中的常见程度。  
* **本体分类 (Ontology)**：确定该概念的上位范畴，如物体 (OBJECT)、过程 (PROCESS)、属性 (PROPERTY)、状态 (STATE)、位置 (LOCATION) 或抽象概念 (ABSTRACT)。

### **2\. 逻辑引擎与感质结构 (Qualia Engine)**

SenseEntity 利用 Pustejovsky 的感质理论（Qualia Theory）来构建其逻辑关系网。它包含四个核心维度，每个维度在每种语言下最多容纳 **20 个** 条目：

* **形式角色 (Formal)**：定义该事物是什么，及其在分类学中的位置。  
* **构成角色 (Constitutive)**：描述该事物的物理组成部分或材料。  
* **功能角色 (Telic)**：说明该事物的用途或最终目的。  
* **来源角色 (Agentive)**：描述该事物的来源、创造者或产生方式。  
* **关联锚定**：Qualia 里的每一个条目不仅有文本，还自带一套指纹，确保逻辑链条的深度锚定。  
* **多语言短语支持**：每个维度支持 **8 种核心语言**（并可扩展），每种语言最多容纳 20 个条目。条目内容可以是**单个词汇或描述性短语**。

### **3\. 语言映射与词壳 (Word Shells)**

语义通过 **WordShell**（词壳）与具体的自然语言词汇相连，每种语言最多可关联 **20 个** 词壳。

* **词汇常见度 (wordFrequency)**： 1-100 的数值。代表该特定词汇在所属语言中的常用程度。  
* **Part of speech（pos）**： 'n.' | 'v.' | 'adj.' | 'adv.' | 'prep.' | 'conj.' | 'pron.' | 'int.'中的一个，要结合word和sense决定。  
* **注音 (Pronunciation)** ：存储对应语言的标准注音。用于语音参考。  
* **等义判定 (Absolute Synonyms)**：标识该词是否与该 Sense 完全等价且可 100% 互换。如果一个词没有任何细微差别标签（如语体、情感等），系统默认为等义词。  
* **细微差别 (Nuances)**：记录词汇的语体（如俚语、正式）、强度、情感色彩、所属领域和时代感。  
* **难度分级 (Level)**：词语的难度等级（从该语言难度映射到 A1-C2）

### **4\. 表现形式库 (Representation Libraries)**

为了支持多模态和叙事体验，SenseEntity 包含了丰富的表现层数据：

* **视觉库 (Visual)**：**\[独立生成与存储\]**存储不同人格或状态下的 SVG 动画，例如一个概念可以有“默认”或“魔法”等不同视觉表现。  
* **叙事库 (FlavorText)**：存储由不同 AI 人格（如“小丑”、“先知”）驱动的叙事性描述和用法示例。  
* **释义库 (Meaning)**：存储 8 种语言的词典定义（每种语言上限 40 字/符）。

### **5\. 沉淀机制与数据进化 (Sedimentation & Meta)**

SenseEntity 具备自我进化的能力，通过 **沉淀模块 \[14\]** 管理数据质量：

* **稳定性 (Stability)**：每个可修改的数据项（如某个翻译或逻辑链接）都有独立的稳定性评分（根据玩家反馈增减）。  
* **发现者记录 (FirstDiscoverer)**：系统会记录 Qualia、视觉、描述和释义等子项的第一个生成者/发现者。  
* **锁定与替换**：数据项达到数量上限（20个）后，只有通过沉淀机制才能替换低稳定性的旧数据，确保数据库始终保留高质量内容。


### 

# **\[数据定义\]**

### 

| Data Item | Sub-items (within the field) | Format / Type | Constraints & Capacity | Mandatory | Meta Description | Remarks |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| Identity & Fingerprint | uid | UUID String | Permanent & Unique. | Yes | None | Master anchor for the sense. |
|  | fingerprint | Fingerprint Object | Exactly 6 English words (3 Tiers). | Yes | None | Semantic DNA for matching. |
|  | frequency | integer (1-100) | Range: 1 (Rare) to 100 (Common). | Yes | Stability only | Represents concept commonness. |
|  | ontology | Enum | OBJECT, PROCESS, PROPERTY, etc. | Yes | Stability + firstDiscoverer | Categorical nature. Attribution anchor. |
| Qualia Engine | formal, constitutive, telic, agentive | Record\<Language, QualiaItem\[\]\> | 8 Core Languages \+ dynamic injection support. | No | Stability \+ firstDiscoverer (on text) | Each slot supports words or phrases. Max 20 items per language per slot. |
| Visual Library | uid | string | The same as its according sense uid | No | None |  |
|  | id | string | “default” as default | No | None |  |
|  | payload | string |  | No | Stability + firstDiscoverer | Visual entries are stored as complete,indivisible payloads  |
| FlavorText | persona, text, example | FlavorTextEntry[] | N/A | No | Stability (per text/example) | Persona-driven narrative; separate columns for text/example maps. |
| Meaning | Dictionary Definition | Record\<Language, PropertyEntry\> | Max 40 characters/tokens. | No | Stability + firstDiscoverer | Concise definitions for each language. |
| WordShells | shells | Record\<Language, WordShell[]\> | Max 20 shells per language. | No | Stability + firstDiscoverer | Single column 'shells' stores all language mappings as a JSON map. |
|  | pronunciation | string |  | No | Stability only | Phonetic guide for the word. |
|  | wordFrequency | integer (1-100) | Range: 1 (Rare) to 100 (Common). | No | Stability only | Specific word commonness within its language. |
|  | pos, level | Enum | POS (n., v., etc.), Level (A1-C2). | No | Stability only | Linguistic metadata. |

### 

### 

### 

# **[代码定义 ]**

/**
 * Project: Semantic Module [08] - SenseEntity Final Authority
 * * Rules:
 * 1. Granular Control: Every modifiable sub-item has its own 'meta' for individual sedimentation.
 * 2. Meta Content: 
 * - Default: 'stability' only.
 * - Special (Qualia, text, visual, meaning): 'stability' + 'firstDiscoverer'.
 * - 'status' and 'version' are removed.
 * 3. Identity Anchors: 'uid', 'fingerprint' remain raw values.
 * 4. Quantity Caps: All Qualia slots and WordShell arrays are limited to 20 items per language.
 * 5. High Fidelity: Visual entries are stored as complete, indivisible payloads to preserve * all logic, animation, and state data.
 */

/** Support for 8 core languages + future injections. */
export type Language = 'en' | 'zh-CN' | 'fr' | 'de' | 'ja' | 'es' | 'it' | 'pt' | string;
export type POS = 'n.' | 'v.' | 'adj.' | 'adv.' | 'prep.' | 'conj.' | 'pron.' | 'int.';
export type WordLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/**
 * Metadata for tracking quality and discovery.
 * Interfaces with the Sedimentation Module [14].
 */
export interface EntryMetadata {
  /** Community score (+1 / -1). Records for all modifiable items. */
  stability: number;         
  /** The ID/Name of the first user who generated/discovered this specific data item.
   * Only recorded for: Qualia, text, visual, and meaning sub-items. */
  firstDiscoverer?: string;   
}

/**
 * Generic wrapper for data requiring individual sedimentation control.
 */
export interface PropertyEntry<T> {
  value: T;
  meta: EntryMetadata;
}

/**
 * Semantic Fingerprint: The immutable "DNA" of a sense.
 */
export interface Fingerprint {
  /** EXACTLY 6 English anchor words. Immutable and excluded from meta. */
  items: {   
    word: string;   
    tier: 1 | 2 | 3;   
  }[];   
}

/**
 * Visual Entry - High Fidelity Payload with Entity Mapping.
 * The 'uid' maps back to the parent SenseEntity for relational integrity.
 */
export interface VisualEntry {
  /** The UID of the parent SenseEntity. */
  uid: string;               
  /** Unique ID for the visual state (e.g., 'default', 'magic'). */
  id: string;                
  /** The complete visual logic payload (React/Framer-Motion or SVG+CSS). */
  payload: string;           
  meta: EntryMetadata;       
}

/**
 * Persona-driven narrative library entry.
 * Meta allows individual control for different personas and their translations.
 */
export interface FlavorTextEntry {
  /** The identifier for the AI Persona. */
  persona: string;                    
  }\>;

  /\*\* Global meta for the shell entry (stability only). \*/  
  meta: EntryMetadata;  
}

/\*\*  
 \* THE SENSE ENTITY  
 \* The master object representing a distinct concept.  
 \*/  
export interface SenseEntity {  
  // \--- MANDATORY CORE IDENTITY (Exempt from meta) \---  
  uid: string;   
  fingerprint: Fingerprint;   
    
  // \--- MODIFIABLE CORE (With stability only) \---  
  ontology: PropertyEntry\<'OBJECT' | 'PROCESS' | 'PROPERTY' | 'STATE' | 'LOCATION' | 'ABSTRACT'\>;  
  /\*\* General frequency of this concept (1-100). \*/  
  frequency: PropertyEntry\<number\>;

  // \--- OPTIONAL DATA \---  
    
  /\*\* Logical Engine. MAX 20 items per language per slot.   
   \* Each item tracks stability and firstDiscoverer. Supports words or phrases. \*/  
  qualia?: {  
    formal: Record\<Language, QualiaItem\[\]\>;        
    constitutive: Record\<Language, QualiaItem\[\]\>;   
    telic: Record\<Language, QualiaItem\[\]\>;         
    agentive: Record\<Language, QualiaItem\[\]\>;      
  };

  /\*\* Library of visuals (SVG data). Meta tracks stability and firstDiscoverer. \*/  
  visual?: VisualEntry\[\];   
    
  /\*\* Library of narrative styles. Meta tracks stability and firstDiscoverer for text sub-items. \*/  
  flavorText?: FlavorTextEntry\[\];  
    
  /** Dictionary definitions. Each language has its own stability. */  
  meaning?: Record\<Language, PropertyEntry\<string\>\>;  
    
  /\*\* Synonym collections. MAX 20 items per language.   
   \* WordShell internal items track stability (and firstDiscoverer for 'text'). \*/  
  shells?: Record\<Language, WordShell\[\]\>;  

