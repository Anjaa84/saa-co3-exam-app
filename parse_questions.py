#!/usr/bin/env python3
"""
AWS SAA-C03 Question Parser
Combines PDF-extracted questions with TXT answers/explanations
to produce a structured questions.json file.
"""

import re
import json
import difflib
import sys

# ─────────────────────────────────────────────────────────
# Topic / Subtopic keyword map (ordered most-specific first)
# ─────────────────────────────────────────────────────────
TOPIC_KEYWORDS = [
    # Storage – S3
    (r'S3 Transfer Acceleration|Transfer Acceleration', 'Storage', 'S3 Transfer Acceleration'),
    (r'S3 Intelligent.Tiering|Intelligent.Tiering', 'Storage', 'S3 Intelligent-Tiering'),
    (r'S3 Glacier Deep Archive|Glacier Deep Archive', 'Storage', 'S3 Glacier Deep Archive'),
    (r'S3 Glacier Flexible|Glacier Flexible Retrieval', 'Storage', 'S3 Glacier Flexible Retrieval'),
    (r'Glacier', 'Storage', 'S3 Glacier'),
    (r'S3 Lifecycle|Lifecycle policy', 'Storage', 'S3 Lifecycle Policies'),
    (r'Cross.Region Replication|CRR', 'Storage', 'S3 Cross-Region Replication'),
    (r'S3 Object Lock', 'Storage', 'S3 Object Lock'),
    (r'MFA Delete', 'Storage', 'S3 MFA Delete'),
    (r'S3 Versioning|versioning.*S3|S3.*version', 'Storage', 'S3 Versioning'),
    (r'presigned URL|pre-signed URL', 'Storage', 'S3 Pre-Signed URLs'),
    (r'S3 Select', 'Storage', 'S3 Select'),
    (r'S3 File Gateway|File Gateway', 'Storage', 'Storage Gateway – S3 File Gateway'),
    (r'Volume Gateway', 'Storage', 'Storage Gateway – Volume Gateway'),
    (r'Tape Gateway', 'Storage', 'Storage Gateway – Tape Gateway'),
    (r'Storage Gateway', 'Storage', 'AWS Storage Gateway'),
    (r'Snowball Edge|Snowball|Snow Family', 'Storage', 'AWS Snow Family'),
    (r'DataSync', 'Storage', 'AWS DataSync'),
    (r'Transfer Family|AWS Transfer', 'Storage', 'AWS Transfer Family'),
    (r'Amazon S3\b|S3 bucket|S3 Standard', 'Storage', 'Amazon S3'),
    (r'EBS.*snapshot|snapshot.*EBS|fast snapshot restore', 'Storage', 'EBS Snapshots'),
    (r'Elastic Block Store|Amazon EBS|EBS volume|EBS-backed', 'Storage', 'Amazon EBS'),
    (r'Elastic File System|Amazon EFS', 'Storage', 'Amazon EFS'),
    (r'FSx for Windows|FSx for Lustre|FSx for NetApp|Amazon FSx', 'Storage', 'Amazon FSx'),

    # Compute
    (r'Lambda.*concurrency|concurrency.*Lambda|reserved concurrency|provisioned concurrency', 'Compute', 'Lambda Concurrency'),
    (r'Lambda.*layer|layer.*Lambda', 'Compute', 'Lambda Layers'),
    (r'Lambda function|AWS Lambda', 'Compute', 'AWS Lambda'),
    (r'AWS Fargate|Fargate', 'Compute', 'AWS Fargate'),
    (r'Amazon ECS|Elastic Container Service', 'Compute', 'Amazon ECS'),
    (r'Amazon EKS|Elastic Kubernetes', 'Compute', 'Amazon EKS'),
    (r'Elastic Beanstalk', 'Compute', 'AWS Elastic Beanstalk'),
    (r'AWS Batch', 'Compute', 'AWS Batch'),
    (r'Auto Scaling group|EC2 Auto Scaling|Auto Scaling policy|target tracking|step scaling', 'Compute', 'EC2 Auto Scaling'),
    (r'Spot Instance|Spot Fleet|Spot capacity', 'Compute', 'EC2 Spot Instances'),
    (r'Reserved Instance', 'Compute', 'EC2 Reserved Instances'),
    (r'Savings Plan', 'Compute', 'EC2 Savings Plans'),
    (r'Dedicated Host|Dedicated Instance', 'Compute', 'EC2 Dedicated Hosts'),
    (r'instance type|vertical scal', 'Compute', 'EC2 Instance Types'),
    (r'placement group', 'Compute', 'EC2 Placement Groups'),
    (r'instance store', 'Compute', 'EC2 Instance Store'),
    (r'Amazon EC2|EC2 instance', 'Compute', 'Amazon EC2'),

    # Database
    (r'Aurora Auto Scaling|Aurora Replica|Aurora.*read replica', 'Database', 'Aurora Auto Scaling & Replicas'),
    (r'Aurora Serverless', 'Database', 'Amazon Aurora Serverless'),
    (r'Amazon Aurora', 'Database', 'Amazon Aurora'),
    (r'RDS Proxy', 'Database', 'Amazon RDS Proxy'),
    (r'RDS Multi.AZ|Multi.AZ.*RDS|RDS.*Multi.AZ|Multi-AZ deployment', 'Database', 'RDS Multi-AZ'),
    (r'RDS Read Replica|Read Replica', 'Database', 'RDS Read Replicas'),
    (r'Amazon RDS', 'Database', 'Amazon RDS'),
    (r'DynamoDB.*DAX|DAX', 'Database', 'DynamoDB DAX'),
    (r'DynamoDB.*stream|DynamoDB Streams', 'Database', 'DynamoDB Streams'),
    (r'DynamoDB.*global table|global table', 'Database', 'DynamoDB Global Tables'),
    (r'DynamoDB.*TTL|TTL.*DynamoDB', 'Database', 'DynamoDB TTL'),
    (r'on-demand.*capacity|provisioned.*capacity|DynamoDB.*capacity', 'Database', 'DynamoDB Capacity Modes'),
    (r'Amazon DynamoDB|DynamoDB', 'Database', 'Amazon DynamoDB'),
    (r'ElastiCache.*Redis|Redis', 'Database', 'ElastiCache for Redis'),
    (r'ElastiCache.*Memcached|Memcached', 'Database', 'ElastiCache for Memcached'),
    (r'Amazon ElastiCache|ElastiCache', 'Database', 'Amazon ElastiCache'),
    (r'Amazon Redshift', 'Database', 'Amazon Redshift'),
    (r'Amazon Neptune', 'Database', 'Amazon Neptune'),
    (r'Amazon DocumentDB', 'Database', 'Amazon DocumentDB'),
    (r'Amazon Keyspaces', 'Database', 'Amazon Keyspaces'),
    (r'Amazon QLDB', 'Database', 'Amazon QLDB'),

    # Networking & Content Delivery
    (r'Gateway Load Balancer', 'Networking', 'Gateway Load Balancer'),
    (r'Network Load Balancer|NLB', 'Networking', 'Network Load Balancer'),
    (r'Application Load Balancer|ALB', 'Networking', 'Application Load Balancer'),
    (r'Elastic Load Bal', 'Networking', 'Elastic Load Balancing'),
    (r'Global Accelerator', 'Networking', 'AWS Global Accelerator'),
    (r'CloudFront.*origin|origin.*CloudFront|OAI|origin access', 'Networking', 'CloudFront Origins & Access'),
    (r'CloudFront.*cache|cache.*CloudFront|cache behavior', 'Networking', 'CloudFront Caching'),
    (r'Amazon CloudFront|CloudFront distribution', 'Networking', 'Amazon CloudFront'),
    (r'latency.based routing|failover routing|geolocation routing|weighted routing|geoproximity|multivalue', 'Networking', 'Route 53 Routing Policies'),
    (r'Route 53.*health check|health check.*Route 53', 'Networking', 'Route 53 Health Checks'),
    (r'Amazon Route 53|Route 53', 'Networking', 'Amazon Route 53'),
    (r'API Gateway.*REST|REST.*API|REST API', 'Networking', 'API Gateway REST APIs'),
    (r'API Gateway.*WebSocket|WebSocket', 'Networking', 'API Gateway WebSocket APIs'),
    (r'Amazon API Gateway|API Gateway', 'Networking', 'Amazon API Gateway'),
    (r'gateway.*VPC endpoint|VPC gateway endpoint|gateway endpoint.*S3|gateway endpoint.*DynamoDB', 'Networking', 'VPC Gateway Endpoints'),
    (r'interface.*VPC endpoint|VPC interface endpoint|PrivateLink', 'Networking', 'VPC Interface Endpoints / PrivateLink'),
    (r'VPC peering', 'Networking', 'VPC Peering'),
    (r'Transit Gateway', 'Networking', 'AWS Transit Gateway'),
    (r'Direct Connect', 'Networking', 'AWS Direct Connect'),
    (r'Site-to-Site VPN|VPN connection|VPN tunnel|Client VPN', 'Networking', 'AWS VPN'),
    (r'NAT Gateway|NAT instance', 'Networking', 'NAT Gateway'),
    (r'Internet Gateway', 'Networking', 'Internet Gateway'),
    (r'security group', 'Networking', 'Security Groups'),
    (r'Network ACL|NACL|network access control', 'Networking', 'Network ACLs'),
    (r'VPC Flow Log', 'Networking', 'VPC Flow Logs'),
    (r'VPC|Virtual Private Cloud', 'Networking', 'Amazon VPC'),
    (r'AWS Local Zone', 'Networking', 'AWS Local Zones'),
    (r'AWS Wavelength', 'Networking', 'AWS Wavelength'),

    # Security, Identity & Compliance
    (r'IAM role.*EC2|EC2.*IAM role|instance profile', 'Security', 'IAM Roles for EC2'),
    (r'permission boundary|Permission Boundary', 'Security', 'IAM Permission Boundaries'),
    (r'PrincipalOrgID|aws:PrincipalOrg|Organizations.*SCP|Service Control Policy|SCP\b', 'Security', 'AWS Organizations SCPs'),
    (r'cross.account.*role|assume.*role|AssumeRole|role.*trust', 'Security', 'IAM Cross-Account Roles'),
    (r'IAM policy|identity.*policy|resource-based policy|bucket policy', 'Security', 'IAM Policies'),
    (r'IAM\b|Identity and Access Management', 'Security', 'AWS IAM'),
    (r'AWS KMS|Key Management Service|customer managed key|CMK|AWS managed key', 'Security', 'AWS KMS'),
    (r'Secrets Manager|secret rotation|secret.*Aurora|secret.*RDS', 'Security', 'AWS Secrets Manager'),
    (r'Parameter Store|SSM Parameter', 'Security', 'Systems Manager Parameter Store'),
    (r'Certificate Manager|ACM|SSL.*certificate|TLS.*certificate', 'Security', 'AWS Certificate Manager'),
    (r'Shield Advanced', 'Security', 'AWS Shield Advanced'),
    (r'AWS Shield', 'Security', 'AWS Shield'),
    (r'AWS WAF|Web Application Firewall|WAF rule|WAF ACL', 'Security', 'AWS WAF'),
    (r'Network Firewall', 'Security', 'AWS Network Firewall'),
    (r'Amazon GuardDuty|GuardDuty', 'Security', 'Amazon GuardDuty'),
    (r'Amazon Inspector', 'Security', 'Amazon Inspector'),
    (r'Amazon Macie', 'Security', 'Amazon Macie'),
    (r'Security Hub', 'Security', 'AWS Security Hub'),
    (r'CloudHSM', 'Security', 'AWS CloudHSM'),
    (r'IAM Identity Center|AWS SSO|Single Sign.On', 'Security', 'AWS IAM Identity Center (SSO)'),
    (r'Amazon Cognito|Cognito User Pool|Cognito Identity Pool', 'Security', 'Amazon Cognito'),
    (r'Firewall Manager', 'Security', 'AWS Firewall Manager'),
    (r'AWS Artifact', 'Security', 'AWS Artifact'),

    # Analytics
    (r'Kinesis Data Firehose|Firehose', 'Analytics', 'Amazon Kinesis Data Firehose'),
    (r'Kinesis Data Streams', 'Analytics', 'Amazon Kinesis Data Streams'),
    (r'Kinesis Data Analytics', 'Analytics', 'Amazon Kinesis Data Analytics'),
    (r'Amazon Kinesis', 'Analytics', 'Amazon Kinesis'),
    (r'Amazon Athena', 'Analytics', 'Amazon Athena'),
    (r'AWS Glue', 'Analytics', 'AWS Glue'),
    (r'Amazon EMR', 'Analytics', 'Amazon EMR'),
    (r'Amazon QuickSight', 'Analytics', 'Amazon QuickSight'),
    (r'OpenSearch|Elasticsearch', 'Analytics', 'Amazon OpenSearch Service'),
    (r'Lake Formation', 'Analytics', 'AWS Lake Formation'),
    (r'AWS Data Exchange', 'Analytics', 'AWS Data Exchange'),

    # Application Integration
    (r'SQS FIFO|FIFO.*queue|FIFO.*SQS', 'Integration', 'Amazon SQS FIFO Queues'),
    (r'Amazon SQS|Simple Queue Service|SQS queue', 'Integration', 'Amazon SQS'),
    (r'Amazon SNS|Simple Notification Service|SNS topic', 'Integration', 'Amazon SNS'),
    (r'EventBridge|CloudWatch Events', 'Integration', 'Amazon EventBridge'),
    (r'Step Functions|state machine', 'Integration', 'AWS Step Functions'),
    (r'Amazon AppFlow', 'Integration', 'Amazon AppFlow'),
    (r'Amazon MQ|ActiveMQ|RabbitMQ', 'Integration', 'Amazon MQ'),

    # Management & Governance
    (r'CloudWatch.*alarm|alarm.*CloudWatch', 'Management', 'CloudWatch Alarms'),
    (r'CloudWatch.*dashboard', 'Management', 'CloudWatch Dashboards'),
    (r'CloudWatch.*Logs|Logs Insights', 'Management', 'CloudWatch Logs'),
    (r'Amazon CloudWatch', 'Management', 'Amazon CloudWatch'),
    (r'AWS CloudTrail', 'Management', 'AWS CloudTrail'),
    (r'AWS Config.*rule|Config rule', 'Management', 'AWS Config Rules'),
    (r'AWS Config', 'Management', 'AWS Config'),
    (r'Systems Manager.*Session Manager|Session Manager', 'Management', 'Systems Manager Session Manager'),
    (r'Systems Manager.*Patch Manager|Patch Manager', 'Management', 'Systems Manager Patch Manager'),
    (r'Systems Manager.*Run Command|Run Command', 'Management', 'Systems Manager Run Command'),
    (r'AWS Systems Manager|Systems Manager', 'Management', 'AWS Systems Manager'),
    (r'AWS Organizations|organization.*account|management account', 'Management', 'AWS Organizations'),
    (r'Cost Explorer', 'Management', 'AWS Cost Explorer'),
    (r'AWS Budgets', 'Management', 'AWS Budgets'),
    (r'Trusted Advisor', 'Management', 'AWS Trusted Advisor'),
    (r'Service Catalog', 'Management', 'AWS Service Catalog'),
    (r'Control Tower', 'Management', 'AWS Control Tower'),
    (r'CloudFormation|infrastructure as code|IaC', 'Management', 'AWS CloudFormation'),
    (r'AWS OpsWorks', 'Management', 'AWS OpsWorks'),
    (r'AWS Health', 'Management', 'AWS Health Dashboard'),

    # Migration & Transfer
    (r'Database Migration Service|AWS DMS|DMS\b', 'Migration', 'AWS Database Migration Service'),
    (r'Application Migration Service|AWS MGN', 'Migration', 'AWS Application Migration Service'),
    (r'Migration Hub', 'Migration', 'AWS Migration Hub'),
    (r'AWS Backup', 'Migration', 'AWS Backup'),

    # AI/ML
    (r'Amazon Rekognition', 'AI/ML', 'Amazon Rekognition'),
    (r'Amazon Comprehend', 'AI/ML', 'Amazon Comprehend'),
    (r'Amazon Textract', 'AI/ML', 'Amazon Textract'),
    (r'Amazon Transcribe', 'AI/ML', 'Amazon Transcribe'),
    (r'Amazon Translate', 'AI/ML', 'Amazon Translate'),
    (r'Amazon SageMaker|SageMaker', 'AI/ML', 'Amazon SageMaker'),
    (r'Amazon Polly', 'AI/ML', 'Amazon Polly'),
    (r'Amazon Lex', 'AI/ML', 'Amazon Lex'),
    (r'Amazon Kendra', 'AI/ML', 'Amazon Kendra'),
    (r'Amazon Bedrock', 'AI/ML', 'Amazon Bedrock'),
    (r'Amazon Personalize', 'AI/ML', 'Amazon Personalize'),
    (r'Amazon Forecast', 'AI/ML', 'Amazon Forecast'),
]

# ─────────────────────────────────────────────────────────
# Step 1 – Parse PDF (questions_raw.txt)
# ─────────────────────────────────────────────────────────

def parse_pdf_questions(filepath: str) -> dict:
    """Returns {question_number: {question, type, num_correct, options}}"""
    with open(filepath, encoding='utf-8') as f:
        content = f.read()

    # Split into blocks at each "Question #N" header.
    # Use a simple lookahead without ^ anchor — some markers follow a form-feed (\x0c)
    # page-break character that prevents ^ from matching.
    raw_blocks = re.split(r'(?=Question #\d+\n)', content)

    questions = {}
    for block in raw_blocks:
        m = re.match(r'Question #(\d+)', block)
        if not m:
            continue
        num = int(m.group(1))

        # Strip the "Question #N\n\nTopic N\n\n" header (may be preceded by form-feed \x0c)
        block = re.sub(r'[\x0c]*Question #\d+\s*\n+Topic \d+\s*\n+', '', block)

        # Locate where options start (first line beginning with "A. ")
        opt_start = re.search(r'^A\. ', block, flags=re.MULTILINE)
        if opt_start:
            question_text = block[:opt_start.start()].strip()
            options_section = block[opt_start.start():]
        else:
            question_text = block.strip()
            options_section = ''

        # Parse each option – they end at the next letter or end of block
        options = {}
        for om in re.finditer(r'^([A-E])\.\s*([\s\S]*?)(?=^[A-E]\. |\Z)', options_section, flags=re.MULTILINE):
            letter = om.group(1)
            text = re.sub(r'\s+', ' ', om.group(2).strip())
            options[letter] = text

        # Determine question type from question text
        q_type = 'single'
        num_correct = 1
        if re.search(r'Choose three|Choose THREE', question_text, re.IGNORECASE):
            q_type = 'multiple'
            num_correct = 3
        elif re.search(r'Choose two|Choose TWO', question_text, re.IGNORECASE):
            q_type = 'multiple'
            num_correct = 2

        questions[num] = {
            'id': num,
            'question': question_text,
            'type': q_type,
            'num_correct': num_correct,
            'options': options,
        }

    return questions


# ─────────────────────────────────────────────────────────
# Step 2 – Parse TXT answers + explanations
# ─────────────────────────────────────────────────────────

def extract_answer_letters(block: str) -> tuple[list[str], str]:
    """
    Try every known answer format.
    Returns (letters, fallback_ans_text) where:
      - letters is a list of capital letters (may be empty)
      - fallback_ans_text is raw answer text for fuzzy matching when letters is []
    """
    # ── Format 1: "Answers: A) text + C) text" or "Answer: A, B"
    m = re.search(r'Answers?:\s*([A-E](?:[^A-E\n]{1,8}[A-E])*)', block, re.IGNORECASE)
    if m:
        return list(dict.fromkeys(re.findall(r'[A-E]', m.group(1)))), ''

    # ── Format 2: "Correct answer A:" or "Correct Answer: A, C"
    m = re.search(r'Correct [Aa]nswer[s]?\s*:?\s*([A-E](?:\s*(?:,|and|&|\+)\s*[A-E])*)', block)
    if m:
        return list(dict.fromkeys(re.findall(r'[A-E]', m.group(1)))), ''

    lines = block.split('\n')
    collected_letters: list[str] = []
    fallback_text = ''
    past_num_line = False
    question_ended = False  # True after "Which...?" / "What should...?" line

    for line in lines:
        stripped = line.strip()

        if not past_num_line:
            if re.match(r'^\d+[.\]]\s*', stripped):
                past_num_line = True
                # ── Format 5: answer on same line as question number, e.g. "96.C. Users..."
                # After stripping the leading "N]" or "N." prefix, check for a letter answer
                rest = re.sub(r'^\d+[.\]]\s*', '', stripped)
                lm = re.match(r'^([A-E])[.\)]\s+\S', rest)
                if lm:
                    return [lm.group(1)], ''
            continue

        # Hard stop
        if re.match(r'^[-*]{5,}', stripped):
            break

        # "ans-" signals: stop letter scan; text captured separately
        if re.match(r'^ans[-:\s]', stripped, re.IGNORECASE):
            break

        # Detect end of question body (last sentence of the question)
        if re.search(r'\?\s*$', stripped):
            question_ended = True
            continue

        # ── Format 3: "[Letter]. text" or "[Letter]) text" (with period/paren)
        lm = re.match(r'^([A-E])[.\)]\s+\S', stripped)
        if lm:
            collected_letters.append(lm.group(1))
            continue

        # ── Format 4: "[Letter] text" (space only, no period) e.g. "B Create an AWS..."
        lm2 = re.match(r'^([A-E]) (?=[A-Z])', stripped)
        if lm2:
            collected_letters.append(lm2.group(1))
            continue

        # ── Format 6: bare answer text after question ends (no letter prefix)
        #    e.g. " Take EBS snapshots of the production EBS volumes..."
        if question_ended and stripped and not fallback_text and not collected_letters:
            # Must look like a meaningful sentence (starts with capital, not a keyword header)
            if re.match(r'^[A-Z]', stripped) and not re.match(r'^(Option|Note|General|Keywords?|Conditions?|Task|Requirements?)[\s:]', stripped):
                fallback_text = stripped
                continue

        # Non-letter, non-empty line after collecting letters → stop
        if collected_letters and stripped:
            break

    if collected_letters:
        return list(dict.fromkeys(collected_letters)), ''

    return [], fallback_text


def extract_explanation(block: str) -> str:
    """Return the explanation text (everything after the answer line(s))."""
    lines = block.split('\n')
    past_header = False
    past_answer = False
    exp_lines = []

    for line in lines:
        stripped = line.strip()

        if not past_header:
            if re.match(r'^\d+[.\]]\s*', stripped):
                past_header = True
            continue

        is_answer_line = bool(
            re.match(r'^[A-E][.\)]\s+\S', stripped) or
            re.match(r'^ans[-:\s]', stripped, re.IGNORECASE) or
            re.match(r'^Answer[s]?\s*:', stripped, re.IGNORECASE) or
            re.match(r'^Correct [Aa]nswer', stripped)
        )

        if is_answer_line:
            past_answer = True
            continue

        if past_answer and stripped:
            # Skip structural annotation headers
            if re.match(r'^(General line|Conditions?|Task|Requirements?|Keywords?):', stripped):
                continue
            exp_lines.append(stripped)

    explanation = ' '.join(exp_lines)
    return re.sub(r'\s{2,}', ' ', explanation).strip()


def parse_txt_answers(filepath: str) -> dict:
    """
    Returns {question_number: {letters, ans_text, explanation}}

    Uses position-based block extraction: locates every 'N]' or 'N.'
    question-number marker in the file and treats the text between
    consecutive markers as one answer block.  This handles both the
    early '---'-separated format and the compact blank-line format.
    """
    with open(filepath, encoding='utf-8') as f:
        content = f.read()

    # Locate every question-number marker at the start of a line (1–684)
    all_markers = [
        (m.start(), int(m.group(1)))
        for m in re.finditer(r'^(\d+)[.\]]\s*', content, re.MULTILINE)
        if 1 <= int(m.group(1)) <= 684
    ]

    # Keep only the FIRST occurrence of each question number
    seen: dict[int, int] = {}
    for pos, num in all_markers:
        if num not in seen:
            seen[num] = pos

    ordered = sorted(seen.items(), key=lambda x: x[1])  # sort by file position

    answers: dict[int, dict] = {}
    for idx, (num, start) in enumerate(ordered):
        end = ordered[idx + 1][1] if idx + 1 < len(ordered) else len(content)
        block = content[start:end].strip()

        letters, fallback_text = extract_answer_letters(block)

        # Grab raw answer text for fuzzy fallback:
        # 1) explicit "ans-" prefix, 2) bare answer line detected in extract_answer_letters
        ans_text = ''
        ans_m = re.search(r'^ans[-:\s]+(.+)', block, re.IGNORECASE | re.MULTILINE)
        if ans_m:
            ans_text = ans_m.group(1).strip()
        elif fallback_text:
            ans_text = fallback_text

        explanation = extract_explanation(block)

        answers[num] = {
            'letters': letters,
            'ans_text': ans_text,
            'explanation': explanation,
        }

    return answers


# ─────────────────────────────────────────────────────────
# Step 3 – Resolve letters via fuzzy matching
# ─────────────────────────────────────────────────────────

def fuzzy_find_letter(ans_text: str, options: dict) -> list[str]:
    """
    Find which option key(s) best match the given answer text.
    Returns a list of matching letter(s).
    """
    if not ans_text or not options:
        return []

    # Normalise for comparison
    def norm(s):
        return re.sub(r'\s+', ' ', s.lower().strip())

    norm_ans = norm(ans_text)
    best_ratio = 0.0
    best_letter = None

    for letter, opt_text in options.items():
        norm_opt = norm(opt_text)
        # Try substring containment first (fast)
        if norm_ans[:60] in norm_opt or norm_opt[:60] in norm_ans:
            return [letter]
        ratio = difflib.SequenceMatcher(None, norm_ans[:120], norm_opt[:120]).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_letter = letter

    if best_ratio >= 0.45:
        return [best_letter]
    return []


# ─────────────────────────────────────────────────────────
# Step 4 – Topic / subtopic tagging
# ─────────────────────────────────────────────────────────

def tag_question(question_text: str, correct_options_text: str) -> tuple[str, str]:
    """Return (topic, subtopic) based on keyword matching."""
    combined = question_text + ' ' + correct_options_text
    for pattern, topic, subtopic in TOPIC_KEYWORDS:
        if re.search(pattern, combined, re.IGNORECASE):
            return topic, subtopic
    return 'General', 'AWS Architecture'


# ─────────────────────────────────────────────────────────
# Step 5 – Combine and output
# ─────────────────────────────────────────────────────────

def build_questions_json(pdf_path: str, txt_path: str, out_path: str):
    print('Parsing PDF questions …')
    pdf_qs = parse_pdf_questions(pdf_path)
    print(f'  Found {len(pdf_qs)} questions in PDF')

    print('Parsing TXT answers …')
    txt_ans = parse_txt_answers(txt_path)
    print(f'  Found {len(txt_ans)} answer blocks in TXT')

    questions_out = []
    no_letters = []
    no_match = []

    for num in sorted(pdf_qs.keys()):
        pq = pdf_qs[num]
        ta = txt_ans.get(num, {})

        options = pq['options']
        letters = ta.get('letters', [])

        # Fuzzy fallback when no explicit letter was found
        if not letters and ta.get('ans_text'):
            letters = fuzzy_find_letter(ta['ans_text'], options)
            if letters:
                pass  # resolved
            else:
                no_match.append(num)

        needs_review = False
        if not letters:
            no_letters.append(num)
            needs_review = True
            letters = ['A']  # placeholder so the question isn't dropped

        # Build correct answer text for tagging
        correct_text = ' '.join(options.get(l, '') for l in letters)

        topic, subtopic = tag_question(pq['question'], correct_text)

        # Build options list in order
        options_list = [
            {'id': k, 'text': v}
            for k, v in sorted(options.items())
        ]

        questions_out.append({
            'id': num,
            'question': pq['question'],
            'type': pq['type'],
            'numCorrect': pq['num_correct'],
            'options': options_list,
            'correctAnswers': letters,
            'explanation': ta.get('explanation', ''),
            'topic': topic,
            'subtopic': subtopic,
            'needsReview': needs_review,
        })

    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(questions_out, f, indent=2, ensure_ascii=False)

    print(f'\n✓ Wrote {len(questions_out)} questions → {out_path}')
    if no_letters:
        print(f'⚠  {len(no_letters)} questions had no answer resolved (used "A" as placeholder):')
        print(f'   {no_letters[:20]}{"…" if len(no_letters) > 20 else ""}')
    else:
        print('✓ All questions have correct answers resolved')

    # Summary stats
    topics = {}
    for q in questions_out:
        t = q['topic']
        topics[t] = topics.get(t, 0) + 1
    print('\nQuestions per topic:')
    for t, c in sorted(topics.items(), key=lambda x: -x[1]):
        print(f'  {t:20s} {c}')


# ─────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────

if __name__ == '__main__':
    import os
    base = os.path.dirname(os.path.abspath(__file__))
    pdf_raw = os.path.join(base, 'questions_raw.txt')
    txt_sol = os.path.join(base, 'AWS SAA-03 Solution.txt')
    out_json = os.path.join(base, 'questions.json')

    if not os.path.exists(pdf_raw):
        print('ERROR: questions_raw.txt not found. Run:')
        print('  pdftotext "AWS Certified Solutions Architect Associate SAA-C03.pdf" questions_raw.txt')
        sys.exit(1)

    build_questions_json(pdf_raw, txt_sol, out_json)
