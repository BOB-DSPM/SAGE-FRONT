import React, { useState } from 'react';
import { Copy, Check, AlertCircle } from 'lucide-react';

const AwsSetup = () => {
  const [accountId, setAccountId] = useState('');
  const [roleArn, setRoleArn] = useState('');
  const [regions, setRegions] = useState(['ap-northeast-2']);
  const [services, setServices] = useState(['s3', 'rds', 'iam']);
  const [externalId] = useState('dspm-' + Math.random().toString(36).substr(2, 9));
  const [copiedTrust, setCopiedTrust] = useState(false);
  const [copiedExternal, setCopiedExternal] = useState(false);

  const dspmAccountId = '999999999999';

  const trustPolicy = `{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::${dspmAccountId}:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "${externalId}"
        }
      }
    }
  ]
}`;

  const handleCopyTrust = () => {
    navigator.clipboard.writeText(trustPolicy);
    setCopiedTrust(true);
    setTimeout(() => setCopiedTrust(false), 2000);
  };

  const handleCopyExternal = () => {
    navigator.clipboard.writeText(externalId);
    setCopiedExternal(true);
    setTimeout(() => setCopiedExternal(false), 2000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({
      accountId,
      roleArn,
      externalId,
      regions,
      services
    });
    alert('AWS 계정 연동이 완료되었습니다.');
  };

  const availableRegions = [
    'us-east-1',
    'us-west-2',
    'ap-northeast-2',
    'ap-southeast-1',
    'eu-west-1'
  ];

  const availableServices = [
    { id: 's3', name: 'Amazon S3' },
    { id: 'rds', name: 'Amazon RDS' },
    { id: 'dynamodb', name: 'DynamoDB' },
    { id: 'iam', name: 'IAM' },
    { id: 'cloudtrail', name: 'CloudTrail' }
  ];

  const toggleRegion = (region) => {
    if (regions.includes(region)) {
      setRegions(regions.filter(r => r !== region));
    } else {
      setRegions([...regions, region]);
    }
  };

  const toggleService = (service) => {
    if (services.includes(service)) {
      setServices(services.filter(s => s !== service));
    } else {
      setServices([...services, service]);
    }
  };

  return (
    <div className="space-y-6">
      {/* 안내 메시지 */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-primary-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-primary-800">
            <p className="font-medium mb-1">시작하기 전에</p>
            <p>AWS 콘솔에서 IAM Role을 생성하고 아래의 Trust Policy를 설정해주세요.</p>
          </div>
        </div>
      </div>

      {/* Step 1: Trust Policy */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Step 1: Trust Policy 설정</h3>
        <p className="text-sm text-gray-600 mb-3">
          AWS 콘솔에서 IAM Role 생성 시 아래 Trust Policy를 추가하세요.
        </p>
        <div className="relative">
          <pre className="bg-primary-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
            {trustPolicy}
          </pre>
          <button
            onClick={handleCopyTrust}
            className="absolute top-3 right-3 p-2 bg-gray-800 hover:bg-gray-700 rounded transition-colors"
          >
            {copiedTrust ? (
              <Check className="w-4 h-4 text-green-400" />
            ) : (
              <Copy className="w-4 h-4 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Step 2: External ID */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Step 2: External ID</h3>
        <p className="text-sm text-gray-600 mb-3">
          Trust Policy의 ExternalId 조건에 사용할 고유 식별자입니다.
        </p>
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={externalId}
            readOnly
            className="flex-1 px-4 py-2 border rounded-lg bg-gray-50 text-gray-700"
          />
          <button
            onClick={handleCopyExternal}
            className="p-2 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            {copiedExternal ? (
              <Check className="w-5 h-5 text-green-600" />
            ) : (
              <Copy className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Step 3: 계정 정보 입력 */}
      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg p-6 shadow-sm border mb-6">
          <h3 className="text-lg font-semibold mb-4">Step 3: AWS 계정 정보 입력</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                AWS Account ID *
              </label>
              <input
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="123456789012"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IAM Role ARN *
              </label>
              <input
                type="text"
                value={roleArn}
                onChange={(e) => setRoleArn(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="arn:aws:iam::123456789012:role/DSPM-AccessRole"
                required
              />
            </div>
          </div>
        </div>

        {/* Step 4: Region 선택 */}
        <div className="bg-white rounded-lg p-6 shadow-sm border mb-6">
          <h3 className="text-lg font-semibold mb-4">Step 4: 스캔 Region 선택</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {availableRegions.map((region) => (
              <label key={region} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={regions.includes(region)}
                  onChange={() => toggleRegion(region)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{region}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Step 5: Service 선택 */}
        <div className="bg-white rounded-lg p-6 shadow-sm border mb-6">
          <h3 className="text-lg font-semibold mb-4">Step 5: 스캔 서비스 선택</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            Data Target에서 스캔할 저장소를 선택하세요.
          </div>
        </div>

        {/* 제출 버튼 */}
        <button
          type="submit"
          className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-900 transition-colors"
        >
          연동 완료
        </button>
      </form>
    </div>
  );
};

export default AwsSetup;