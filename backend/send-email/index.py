import json
import os
import base64
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Отправляет PDF файл истории чек-листа на указанный email
    Использует Resend API для отправки писем
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    try:
        body_data = json.loads(event.get('body', '{}'))
        email: str = body_data.get('email', '').strip()
        pdf_base64: str = body_data.get('pdfBase64', '')
        
        if not email or '@' not in email:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Некорректный email адрес'}),
                'isBase64Encoded': False
            }
        
        if not pdf_base64:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'PDF файл не предоставлен'}),
                'isBase64Encoded': False
            }
        
        resend_api_key = os.environ.get('RESEND_API_KEY')
        if not resend_api_key:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'API ключ не настроен'}),
                'isBase64Encoded': False
            }
        
        import requests
        
        payload = {
            "from": "noreply@poehali.dev",
            "to": [email],
            "subject": "История чек-листа | Поддержка близких",
            "html": """
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
                        <h1 style="color: white; margin: 0;">История чек-листа</h1>
                        <p style="color: white; margin: 10px 0 0 0;">Памятка для родственников пациента с гипотиреозом</p>
                    </div>
                    <div style="padding: 30px; background-color: #f9fafb; border-radius: 0 0 8px 8px;">
                        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                            Здравствуйте!
                        </p>
                        <p style="color: #374151; font-size: 16px; line-height: 1.6;">
                            Во вложении находится PDF файл с историей выполнения ежедневного чек-листа и рекомендациями по поддержке близкого человека с гипотиреозом.
                        </p>
                        <div style="background-color: #D3E4FD; padding: 20px; border-radius: 8px; margin: 20px 0;">
                            <p style="color: #0EA5E9; font-weight: bold; margin: 0 0 10px 0;">💡 Важно помнить</p>
                            <p style="color: #374151; margin: 0; font-size: 14px;">
                                Ваша поддержка — 50% успеха в лечении! Пациенты, чьи близкие активно участвуют в процессе лечения, быстрее восстанавливаются и лучше соблюдают рекомендации врачей.
                            </p>
                        </div>
                        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                            С наилучшими пожеланиями,<br>
                            Команда проекта "Поддержка близких"
                        </p>
                    </div>
                </div>
            """,
            "attachments": [
                {
                    "filename": "checklist-history.pdf",
                    "content": pdf_base64
                }
            ]
        }
        
        response = requests.post(
            'https://api.resend.com/emails',
            headers={
                'Authorization': f'Bearer {resend_api_key}',
                'Content-Type': 'application/json'
            },
            json=payload,
            timeout=10
        )
        
        if response.status_code == 200:
            return {
                'statusCode': 200,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'success': True,
                    'message': f'Email успешно отправлен на {email}'
                }),
                'isBase64Encoded': False
            }
        else:
            error_data = response.json() if response.text else {}
            return {
                'statusCode': response.status_code,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({
                    'error': 'Ошибка отправки email',
                    'details': error_data
                }),
                'isBase64Encoded': False
            }
            
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': 'Внутренняя ошибка сервера',
                'message': str(e)
            }),
            'isBase64Encoded': False
        }
