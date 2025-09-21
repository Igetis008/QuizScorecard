import React, { useState } from 'react';
import { Upload, Download, FileText, Presentation, Monitor, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import { apiService } from '../../services/api';
import { Team, SlideTemplate } from '../../types';

interface SlideIntegrationProps {
  sessionId: string;
  teams: Team[];
  templates: SlideTemplate[];
  onTemplateUploaded: () => void;
}

export function SlideIntegration({ sessionId, teams, templates, onTemplateUploaded }: SlideIntegrationProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<'powerpoint' | 'google-slides' | 'canva'>('powerpoint');
  const [uploading, setUploading] = useState(false);
  const [mappingConfig, setMappingConfig] = useState<{ [teamName: string]: string }>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Initialize mapping config for teams
      const config: { [teamName: string]: string } = {};
      teams.forEach(team => {
        config[team.name] = `{{${team.name}_score}}`;
      });
      setMappingConfig(config);
    }
  };

  const handleUploadTemplate = async () => {
    if (!selectedFile && selectedPlatform !== 'google-slides') {
      alert('Please select a file to upload');
      return;
    }

    setUploading(true);
    try {
      await apiService.uploadTemplate(
        sessionId,
        selectedPlatform,
        { teamMappings: mappingConfig, presentationId: mappingConfig.presentationId },
        selectedFile || undefined
      );
      
      setSelectedFile(null);
      setMappingConfig({});
      onTemplateUploaded();
      alert('Template uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload template: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const handleExportSlides = async (templateId: string) => {
    setExportLoading(templateId);
    try {
      const result = await apiService.exportSlides(sessionId, templateId);
      
      // Create and download the file
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Failed to export slides: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setExportLoading(null);
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'powerpoint':
        return <FileText className="w-5 h-5" />;
      case 'google-slides':
        return <Presentation className="w-5 h-5" />;
      case 'canva':
        return <Monitor className="w-5 h-5" />;
      default:
        return <FileText className="w-5 h-5" />;
    }
  };

  const getPlatformInstructions = (platform: string) => {
    switch (platform) {
      case 'powerpoint':
        return {
          title: 'PowerPoint Integration',
          steps: [
            'Upload your .pptx file with placeholder text for team scores',
            'Configure team name mappings to match your slide placeholders',
            'Export updated score data and manually replace placeholders',
            'Use Find & Replace in PowerPoint to update all instances'
          ],
          fileTypes: '.pptx, .ppt'
        };
      case 'google-slides':
        return {
          title: 'Google Slides Integration',
          steps: [
            'Get your Google Slides presentation ID from the URL',
            'Identify text box element IDs for each team score',
            'Configure the mapping between teams and element IDs',
            'Export API instructions for automated updates'
          ],
          fileTypes: 'Presentation ID required'
        };
      case 'canva':
        return {
          title: 'Canva Integration',
          steps: [
            'Export your Canva design and note text element positions',
            'Configure team mappings for manual updates',
            'Export score data for manual entry into Canva',
            'Copy and paste scores into your Canva design'
          ],
          fileTypes: 'Manual configuration'
        };
      default:
        return { title: '', steps: [], fileTypes: '' };
    }
  };

  const instructions = getPlatformInstructions(selectedPlatform);

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6">
      <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
        <Presentation className="w-6 h-6 mr-2 text-purple-500" />
        Slide Integration
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Configuration Panel */}
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-4">Platform Selection</h4>
            <div className="grid grid-cols-3 gap-3">
              {(['powerpoint', 'google-slides', 'canva'] as const).map(platform => (
                <button
                  key={platform}
                  onClick={() => setSelectedPlatform(platform)}
                  className={`flex flex-col items-center p-4 rounded-lg border-2 transition-all duration-200 ${
                    selectedPlatform === platform
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  {getPlatformIcon(platform)}
                  <span className="text-sm font-medium mt-2 capitalize">
                    {platform.replace('-', ' ')}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-4">{instructions.title}</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                {instructions.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
          </div>

          {/* File Upload */}
          {selectedPlatform !== 'google-slides' && (
            <div>
              <h5 className="font-medium text-gray-700 mb-3">Upload Template</h5>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept={selectedPlatform === 'powerpoint' ? '.pptx,.ppt' : '*'}
                  onChange={handleFileSelect}
                  className="hidden"
                  id="template-upload"
                />
                <label htmlFor="template-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    {selectedFile ? selectedFile.name : `Click to upload ${instructions.fileTypes}`}
                  </p>
                </label>
              </div>
            </div>
          )}

          {/* Google Slides Configuration */}
          {selectedPlatform === 'google-slides' && (
            <div>
              <h5 className="font-medium text-gray-700 mb-3">Presentation Configuration</h5>
              <input
                type="text"
                placeholder="Google Slides Presentation ID"
                value={mappingConfig.presentationId || ''}
                onChange={(e) => setMappingConfig(prev => ({ ...prev, presentationId: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Find this in your Google Slides URL: docs.google.com/presentation/d/[PRESENTATION_ID]/edit
              </p>
            </div>
          )}

          {/* Team Mapping */}
          {(selectedFile || selectedPlatform === 'google-slides') && (
            <div>
              <h5 className="font-medium text-gray-700 mb-3">Team Score Mappings</h5>
              <div className="space-y-3">
                {teams.map(team => (
                  <div key={team.id} className="flex items-center space-x-3">
                    <div className={`w-4 h-4 rounded-full ${team.color}`}></div>
                    <span className="font-medium text-gray-700 w-24">{team.name}:</span>
                    <input
                      type="text"
                      placeholder={selectedPlatform === 'google-slides' ? 'Element ID' : 'Placeholder text'}
                      value={mappingConfig[team.name] || ''}
                      onChange={(e) => setMappingConfig(prev => ({ ...prev, [team.name]: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload Button */}
          {(selectedFile || selectedPlatform === 'google-slides') && (
            <button
              onClick={handleUploadTemplate}
              disabled={uploading}
              className="w-full bg-purple-500 text-white py-3 px-4 rounded-lg hover:bg-purple-600 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Uploading Template...
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Upload className="w-5 h-5 mr-2" />
                  Save Template Configuration
                </div>
              )}
            </button>
          )}
        </div>

        {/* Templates List */}
        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-4">Configured Templates</h4>
            {templates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No templates configured yet</p>
                <p className="text-sm">Upload a template to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map(template => (
                  <div key={template.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getPlatformIcon(template.platform)}
                        <div>
                          <h6 className="font-medium text-gray-800 capitalize">
                            {template.platform.replace('-', ' ')} Template
                          </h6>
                          <p className="text-sm text-gray-500">
                            Created {new Date(template.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-green-600 font-medium">Ready</span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleExportSlides(template.id)}
                      disabled={exportLoading === template.id}
                      className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors duration-200 font-medium disabled:opacity-50 text-sm"
                    >
                      {exportLoading === template.id ? (
                        <div className="flex items-center justify-center">
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Exporting...
                        </div>
                      ) : (
                        <div className="flex items-center justify-center">
                          <Download className="w-4 h-4 mr-2" />
                          Export Updated Scores
                        </div>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Current Scores Preview */}
          <div>
            <h4 className="text-lg font-medium text-gray-700 mb-4">Current Scores</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                {teams.map(team => (
                  <div key={team.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${team.color}`}></div>
                      <span className="font-medium text-gray-700">{team.name}</span>
                    </div>
                    <span className="text-xl font-bold text-gray-800">{team.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}